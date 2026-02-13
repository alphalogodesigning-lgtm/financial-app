(function () {
  const LEGACY_FALLBACK_SUPABASE_URL = 'https://sssutwexhgcirbsrygxg.supabase.co';
  const LEGACY_FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzc3V0d2V4aGdjaXJic3J5Z3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNTY1NTgsImV4cCI6MjA4NTgzMjU1OH0.pp5tjtDNWSCPAQK753axZcaIuE28VUYXOGR1eQCXkhk';

  const readPublicEnv = (key) => {
    if (typeof window !== 'undefined' && window.__ENV__ && typeof window.__ENV__[key] === 'string') {
      return window.__ENV__[key];
    }
    if (typeof process !== 'undefined' && process.env && typeof process.env[key] === 'string') {
      return process.env[key];
    }
    return '';
  };

  const SUPABASE_URL = readPublicEnv('NEXT_PUBLIC_SUPABASE_URL') || LEGACY_FALLBACK_SUPABASE_URL;
  const SUPABASE_ANON_KEY = readPublicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || LEGACY_FALLBACK_SUPABASE_ANON_KEY;
  const STORAGE_TABLE = 'budget_tracker_state';

  const supabaseClient = (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  const waitForAuthSession = (timeoutMs = 3000) => new Promise((resolve) => {
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

  window.SUPABASE_CONFIG = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    STORAGE_TABLE,
    supabaseClient,
    waitForAuthSession
  };
})();
