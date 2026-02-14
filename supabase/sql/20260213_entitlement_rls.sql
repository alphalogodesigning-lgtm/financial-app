-- Canonical subscription state lives in profiles.subscription_status.
alter table public.profiles
  add column if not exists subscription_status text;

comment on column public.profiles.subscription_status is
  'Canonical Stripe subscription status used for premium entitlement checks.';

create or replace function public.current_user_is_premium()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.subscription_status in ('active', 'trialing')
  );
$$;

revoke all on function public.current_user_is_premium() from public;
grant execute on function public.current_user_is_premium() to authenticated;

-- Premium-only data is moved into a dedicated table protected by premium checks.
create table if not exists public.premium_feature_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  insights jsonb not null default '{}'::jsonb,
  projections jsonb not null default '{}'::jsonb,
  purchase_simulations jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.premium_feature_state enable row level security;

-- Authenticated users can continue using core app state.
alter table public.budget_tracker_state enable row level security;

drop policy if exists "Users can read own budget state" on public.budget_tracker_state;
create policy "Users can read own budget state"
  on public.budget_tracker_state
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can upsert own budget state" on public.budget_tracker_state;
create policy "Users can upsert own budget state"
  on public.budget_tracker_state
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Premium table requires both ownership and premium entitlement.
drop policy if exists "Premium users can read own premium state" on public.premium_feature_state;
create policy "Premium users can read own premium state"
  on public.premium_feature_state
  for select
  to authenticated
  using (auth.uid() = user_id and public.current_user_is_premium());

drop policy if exists "Premium users can write own premium state" on public.premium_feature_state;
create policy "Premium users can write own premium state"
  on public.premium_feature_state
  for all
  to authenticated
  using (auth.uid() = user_id and public.current_user_is_premium())
  with check (auth.uid() = user_id and public.current_user_is_premium());

create or replace function public.get_my_premium_feature_state()
returns public.premium_feature_state
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.premium_feature_state;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_is_premium() then
    raise exception 'Premium subscription required';
  end if;

  select *
  into v_row
  from public.premium_feature_state
  where user_id = v_uid;

  if v_row is null then
    insert into public.premium_feature_state (user_id)
    values (v_uid)
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

grant execute on function public.get_my_premium_feature_state() to authenticated;
