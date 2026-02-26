'use client';

import { supabaseClient, STORAGE_TABLE, waitForAuthSession } from './supabase-client';

const STORAGE_KEY = 'budgetTrackerData';
const AUTH_CACHE_TTL_MS = 10000;
const authCache = {
  session: null,
  user: null,
  sessionFetchedAt: 0,
  userFetchedAt: 0,
  inFlightSession: null,
  inFlightUser: null,
  isSubscribedToAuthChanges: false
};

const redirectToAuth = (options = {}) => {
  const shouldReplace = options.replace === true;
  const target = '/auth';
  if (typeof window === 'undefined') return;
  if (shouldReplace) {
    window.location.replace(target);
    return;
  }
  window.location.href = target;
};

const isFreshAuthCache = (fetchedAt) => Date.now() - fetchedAt < AUTH_CACHE_TTL_MS;

const clearAuthCache = () => {
  authCache.session = null;
  authCache.user = null;
  authCache.sessionFetchedAt = 0;
  authCache.userFetchedAt = 0;
  authCache.inFlightSession = null;
  authCache.inFlightUser = null;
};

const updateSessionCache = (session) => {
  authCache.session = session || null;
  authCache.sessionFetchedAt = Date.now();
  if (session?.user) {
    authCache.user = session.user;
    authCache.userFetchedAt = Date.now();
  }
};

const updateUserCache = (user) => {
  authCache.user = user || null;
  authCache.userFetchedAt = Date.now();
};

const ensureAuthCacheSyncSubscription = () => {
  if (!supabaseClient || authCache.isSubscribedToAuthChanges) return;
  authCache.isSubscribedToAuthChanges = true;
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    clearAuthCache();
    if (session) updateSessionCache(session);
  });
};

const resolveAuthSession = async (options = {}) => {
  if (!supabaseClient) return null;
  ensureAuthCacheSyncSubscription();

  const authContext = options.authContext || null;
  if (authContext?.session !== undefined) {
    updateSessionCache(authContext.session);
    return authContext.session;
  }

  const forceRefresh = options.forceRefresh === true;
  if (!forceRefresh && isFreshAuthCache(authCache.sessionFetchedAt)) return authCache.session;
  if (!forceRefresh && authCache.inFlightSession) return authCache.inFlightSession;

  authCache.inFlightSession = (async () => {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    if (data?.session) {
      updateSessionCache(data.session);
      return data.session;
    }
    const refreshed = await supabaseClient.auth.refreshSession();
    if (refreshed?.data?.session) {
      updateSessionCache(refreshed.data.session);
      return refreshed.data.session;
    }
    const waitedSession = await waitForAuthSession();
    updateSessionCache(waitedSession || null);
    return waitedSession || null;
  })();

  try {
    return await authCache.inFlightSession;
  } finally {
    authCache.inFlightSession = null;
  }
};

const getAuthenticatedUser = async (options = {}) => {
  if (!supabaseClient) return null;
  ensureAuthCacheSyncSubscription();

  const authContext = options.authContext || null;
  if (authContext?.user !== undefined) {
    updateUserCache(authContext.user);
    return authContext.user;
  }

  const forceRefresh = options.forceRefresh === true;
  if (!forceRefresh && isFreshAuthCache(authCache.userFetchedAt)) return authCache.user;
  if (!forceRefresh && authCache.inFlightUser) return authCache.inFlightUser;

  authCache.inFlightUser = (async () => {
    const session = await resolveAuthSession(options);
    if (session?.user) {
      updateUserCache(session.user);
      return session.user;
    }

    const { data, error } = await supabaseClient.auth.getUser();
    if (error) throw error;
    updateUserCache(data?.user || null);
    return data?.user || null;
  })();

  try {
    return await authCache.inFlightUser;
  } finally {
    authCache.inFlightUser = null;
  }
};

export const loadBudgetData = async (options = {}) => {
  const allowLocalFallback = options.localFallback !== false;
  const fallback = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  const parsedFallback = allowLocalFallback && fallback ? JSON.parse(fallback) : null;

  if (!supabaseClient) return parsedFallback;

  try {
    const user = await getAuthenticatedUser(options);
    if (!user) {
      const hasLocalData = Boolean(parsedFallback);
      if (options.redirect !== false && !hasLocalData) redirectToAuth(options);
      return parsedFallback;
    }

    const { data, error } = await supabaseClient
      .from(STORAGE_TABLE)
      .select('data')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    if (data?.data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.data));
      return data.data;
    }
  } catch (err) {
    console.warn('Supabase load failed, using local data.', err);
  }

  return parsedFallback;
};

export { supabaseClient, clearAuthCache, resolveAuthSession, getAuthenticatedUser };
