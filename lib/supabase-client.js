'use client';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const STORAGE_TABLE = 'budget_tracker_state';

export const supabaseClient = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export const waitForAuthSession = (timeoutMs = 3000) =>
  new Promise((resolve) => {
    if (!supabaseClient) {
      resolve(null);
      return;
    }

    let settled = false;
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (settled) return;
      settled = true;
      subscription.unsubscribe();
      resolve(session || null);
    });

    setTimeout(() => {
      if (settled) return;
      settled = true;
      subscription.unsubscribe();
      resolve(null);
    }, timeoutMs);
  });
