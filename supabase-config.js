(function () {
  const SUPABASE_URL = 'https://sssutwexhgcirbsrygxg.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzc3V0d2V4aGdjaXJic3J5Z3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNTY1NTgsImV4cCI6MjA4NTgzMjU1OH0.pp5tjtDNWSCPAQK753axZcaIuE28VUYXOGR1eQCXkhk';
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
