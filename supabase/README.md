# Supabase entitlement hardening

Run `supabase/sql/20260213_entitlement_rls.sql` in the Supabase SQL editor (or via migrations) to enforce server-side premium access controls.

## What this migration does

1. Uses `public.profiles.subscription_status` as the canonical subscription source of truth.
2. Adds `public.current_user_is_premium()` (checks `auth.uid()` and allows only `active`/`trialing`).
3. Keeps non-premium app state in `public.budget_tracker_state` for authenticated users.
4. Moves premium-specific persisted state to `public.premium_feature_state` with RLS requiring both ownership and `current_user_is_premium()`.
5. Exposes `public.get_my_premium_feature_state()` RPC, which performs the same server-side entitlement check.
6. Adds a partial unique index on `public.profiles(stripe_customer_id)` for webhook lookup scalability and one-to-one customer mapping safety.

This prevents premium access from relying on client-side flags and keeps Stripe webhook updates performant as `profiles` grows.
