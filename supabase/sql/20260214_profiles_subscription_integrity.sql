-- Harden Stripe subscription fields on profiles and keep auth/profile rows in sync.
alter table public.profiles
  add column if not exists subscription_status text not null default 'inactive',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

comment on column public.profiles.subscription_status is
  'Canonical Stripe subscription status. Allowed values: inactive, trialing, active, canceled, past_due, unpaid, incomplete, incomplete_expired, paused.';

comment on column public.profiles.stripe_customer_id is
  'Stripe customer id used by webhook handlers to map events to user profiles.';

comment on column public.profiles.stripe_subscription_id is
  'Stripe subscription id currently associated to this user profile.';

-- Normalize any null/legacy values before adding constraints.
update public.profiles
set subscription_status = 'inactive'
where subscription_status is null
   or btrim(subscription_status) = '';

alter table public.profiles
  alter column subscription_status set default 'inactive',
  alter column subscription_status set not null;

alter table public.profiles
  drop constraint if exists profiles_subscription_status_valid;

alter table public.profiles
  add constraint profiles_subscription_status_valid
  check (
    subscription_status in (
      'inactive',
      'trialing',
      'active',
      'canceled',
      'past_due',
      'unpaid',
      'incomplete',
      'incomplete_expired',
      'paused'
    )
  );

create unique index if not exists profiles_stripe_customer_id_uidx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists profiles_stripe_subscription_id_uidx
  on public.profiles (stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists profiles_subscription_status_idx
  on public.profiles (subscription_status);

-- Backfill any missing profile rows for existing auth users.
insert into public.profiles (id)
select u.id
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- Ensure future auth users always get a profile row.
create or replace function public.ensure_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_ensure_profile on auth.users;

create trigger on_auth_user_created_ensure_profile
  after insert on auth.users
  for each row
  execute function public.ensure_profile_for_auth_user();
