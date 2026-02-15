-- Post-deploy verification for:
--   1) 20260213_entitlement_rls.sql
--   2) 20260214_profiles_subscription_integrity.sql
--
-- Run in Supabase SQL Editor (production) after applying migrations.

-- 1) Confirm there are no auth.users missing in public.profiles.
select
  (select count(*) from auth.users) as auth_user_count,
  (select count(*) from public.profiles) as profile_count,
  (
    select count(*)
    from auth.users u
    left join public.profiles p on p.id = u.id
    where p.id is null
  ) as missing_profile_rows;

-- 2) Confirm trigger exists and is attached to auth.users.
select
  t.tgname as trigger_name,
  n.nspname as table_schema,
  c.relname as table_name,
  p.proname as function_name,
  pg_get_triggerdef(t.oid) as trigger_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
where not t.tgisinternal
  and n.nspname = 'auth'
  and c.relname = 'users'
  and t.tgname = 'on_auth_user_created_ensure_profile';

-- 3) Confirm profiles.subscription_status exists and defaults to 'inactive'.
select
  column_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name = 'subscription_status';

-- 4) Optional consistency check for one known user after checkout + return flow.
-- Replace the UUID literal below with the test user's auth.uid/profile id.
select
  id,
  subscription_status,
  stripe_customer_id,
  stripe_subscription_id,
  updated_at
from public.profiles
where id = '00000000-0000-0000-0000-000000000000'::uuid;
