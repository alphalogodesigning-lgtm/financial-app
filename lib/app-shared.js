'use client';

import { supabaseClient, STORAGE_TABLE, waitForAuthSession } from './supabase-client';

const STORAGE_KEY = 'budgetTrackerData';

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

const resolveAuthSession = async () => {
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  if (data?.session) return data.session;
  const refreshed = await supabaseClient.auth.refreshSession();
  if (refreshed?.data?.session) return refreshed.data.session;
  return waitForAuthSession();
};

const getAuthenticatedUser = async () => {
  if (!supabaseClient) return null;
  const session = await resolveAuthSession();
  return session?.user || null;
};

export const loadBudgetData = async (options = {}) => {
  const allowLocalFallback = options.localFallback !== false;
  const fallback = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  const parsedFallback = allowLocalFallback && fallback ? JSON.parse(fallback) : null;

  if (!supabaseClient) return parsedFallback;

  try {
    const user = await getAuthenticatedUser();
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

export { supabaseClient };
