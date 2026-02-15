# Production SQL runbook: entitlement + profiles subscription integrity

Run these scripts in **Supabase SQL Editor** (production project) in this order:

1. `supabase/sql/20260213_entitlement_rls.sql`
2. `supabase/sql/20260214_profiles_subscription_integrity.sql`
3. `supabase/sql/20260215_verify_profiles_subscription_integrity.sql`

## Expected verification output

### Profiles backfill check
- `missing_profile_rows = 0`.
- `profile_count >= auth_user_count` (it can be greater if historical rows exist without a matching auth user).

### Trigger check
One row should be returned with:
- `trigger_name = on_auth_user_created_ensure_profile`
- `table_schema = auth`
- `table_name = users`
- `function_name = ensure_profile_for_auth_user`

### `subscription_status` schema check
One row should be returned with:
- `column_name = subscription_status`
- `is_nullable = NO`
- `column_default` containing `'inactive'`

## Checkout + return re-test
After you complete a checkout + return flow with a known user, rerun the optional query in:
- `supabase/sql/20260215_verify_profiles_subscription_integrity.sql`

Confirm the same user profile row (`id`) now has expected Stripe fields/status updated:
- `subscription_status`
- `stripe_customer_id`
- `stripe_subscription_id`
