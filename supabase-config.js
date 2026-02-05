(function () {
  const SUPABASE_URL = 'https://sssutwexhgcirbsrygxg.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzc3V0d2V4aGdjaXJic3J5Z3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNTY1NTgsImV4cCI6MjA4NTgzMjU1OH0.pp5tjtDNWSCPAQK753axZcaIuE28VUYXOGR1eQCXkhk';
  const STORAGE_TABLE = 'budget_tracker_state';
  const DEVICE_ID_KEY = 'budgetTrackerDeviceId';

  const supabaseClient = (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  window.SUPABASE_CONFIG = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    STORAGE_TABLE,
    DEVICE_ID_KEY,
    supabaseClient
  };
})();
