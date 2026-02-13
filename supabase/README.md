# Supabase entitlement hardening

Run both migrations in order via the Supabase SQL editor (or migration runner):

1. `supabase/sql/20260213_entitlement_rls.sql`
2. `supabase/sql/20260214_profiles_subscription_integrity.sql`

## What this setup enforces

1. Uses `public.profiles.subscription_status` as the canonical subscription source of truth.
2. Adds `public.current_user_is_premium()` (checks `auth.uid()` and allows only `active`/`trialing`).
3. Keeps non-premium app state in `public.budget_tracker_state` for authenticated users.
4. Moves premium-specific persisted state to `public.premium_feature_state` with RLS requiring both ownership and `current_user_is_premium()`.
5. Exposes `public.get_my_premium_feature_state()` RPC, which performs the same server-side entitlement check.
6. Hardens `public.profiles` subscription fields with defaults/constraints/indexes:
   - `subscription_status` is non-null with default `inactive` and a valid-status check constraint.
   - `stripe_customer_id` and `stripe_subscription_id` are indexed with unique partial indexes.
   - `subscription_status` has a query index for entitlement checks.
7. Backfills missing `profiles` rows for existing `auth.users` and installs an `auth.users` trigger to auto-create future profile rows.

## Webhook source of truth expectations

The Stripe webhook should be the only writer of subscription status transitions (`active`, `trialing`, `canceled`, etc.) and should always update rows by `stripe_customer_id`.

Premium access checks must read from DB state at request time (for example through `current_user_is_premium()`), never from frontend-only assumptions.
