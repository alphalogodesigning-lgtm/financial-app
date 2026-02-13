-- Improves Stripe webhook profile lookups by customer id.
create unique index if not exists profiles_stripe_customer_id_uidx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;
