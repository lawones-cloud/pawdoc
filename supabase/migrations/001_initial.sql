-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) primary key,
  email text,
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);
alter table public.users enable row level security;
create policy "Users read own" on public.users for select using (auth.uid() = id);
create policy "Users update own" on public.users for update using (auth.uid() = id);
create policy "Users insert own" on public.users for insert with check (auth.uid() = id);

-- Auto-create user row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email) values (new.id, new.email);
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Subscriptions table
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  lemonsqueezy_order_id text unique,
  lemonsqueezy_subscription_id text unique,
  status text default 'active' check (status in ('active', 'cancelled', 'expired')),
  variant_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.subscriptions enable row level security;
create policy "Users read own subscriptions" on public.subscriptions for select using (auth.uid() = user_id);

-- Usage logs table
create table public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  action text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);
alter table public.usage_logs enable row level security;
create policy "Users read own logs" on public.usage_logs for select using (auth.uid() = user_id);
create policy "Users insert own logs" on public.usage_logs for insert with check (auth.uid() = user_id);
