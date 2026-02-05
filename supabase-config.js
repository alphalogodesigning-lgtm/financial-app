(function () {
  const SUPABASE_URL = 'https://sssutwexhgcirbsrygxg.supabase.co';
  const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
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
