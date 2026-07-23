-- Sousbot initial schema
-- Tables, RLS policies, triggers, RPC, indexes per PRD "Data model" + "API contracts".

create extension if not exists pgcrypto;

-- ============================================================================
-- TABLES
-- ============================================================================

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  avatar_url    text,
  language      text not null default 'en',
  units         text not null default 'metric' check (units in ('metric', 'imperial')),
  diet_flags    text[] not null default '{}',
  allergies     text[] not null default '{}',
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.recipes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  title              text not null,
  description        text,
  ingredients        jsonb not null default '[]'::jsonb,  -- [{name, quantity, unit}]
  steps              jsonb not null default '[]'::jsonb,  -- [string, ...]
  macros             jsonb,                                -- {calories, protein_g, carbs_g, fat_g}
  prep_minutes       int,
  cook_minutes       int,
  servings           int,
  difficulty         text,
  tags               text[] not null default '{}',
  image_url          text,
  image_status       text not null default 'none' check (image_status in ('none', 'pending', 'ready', 'failed')),
  generation_params  jsonb,
  is_saved           boolean not null default false,
  source             text not null check (source in ('generated', 'adapted')),
  created_at         timestamptz not null default now()
);

create table public.taste_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  recipe_id   uuid not null references public.recipes(id) on delete cascade,
  verdict     text not null check (verdict in ('like', 'dislike')),
  created_at  timestamptz not null default now()
);

create table public.pantry_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  quantity    numeric,
  unit        text,
  is_staple   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.meal_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  week_start  date not null,
  created_at  timestamptz not null default now()
);

create table public.meal_plan_entries (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.meal_plans(id) on delete cascade,
  recipe_id   uuid not null references public.recipes(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  meal_slot   text not null check (meal_slot in ('breakfast', 'lunch', 'dinner', 'snack'))
);

create table public.shopping_list_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  quantity        numeric,
  unit            text,
  checked         boolean not null default false,
  source_plan_id  uuid references public.meal_plans(id) on delete set null,
  created_at      timestamptz not null default now()
);

create table public.subscriptions (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  status              text not null default 'free' check (status in ('free', 'pro', 'grace', 'expired')),
  platform            text check (platform in ('stripe', 'revenuecat')),
  product_id          text,
  current_period_end  timestamptz,
  raw                 jsonb,
  updated_at          timestamptz not null default now()
);

create table public.usage_counters (
  user_id           uuid not null references auth.users(id) on delete cascade,
  period            text not null,  -- 'YYYY-MM'
  generation_count  int not null default 0,
  updated_at        timestamptz not null default now(),
  primary key (user_id, period)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index idx_recipes_user_id_created_at on public.recipes (user_id, created_at desc);
create index idx_taste_events_user_id on public.taste_events (user_id);
create index idx_taste_events_recipe_id on public.taste_events (recipe_id);
create index idx_pantry_items_user_id on public.pantry_items (user_id);
create index idx_meal_plans_user_id on public.meal_plans (user_id);
create index idx_meal_plan_entries_plan_id on public.meal_plan_entries (plan_id);
create index idx_meal_plan_entries_recipe_id on public.meal_plan_entries (recipe_id);
create index idx_shopping_list_items_user_id on public.shopping_list_items (user_id);
create index idx_shopping_list_items_source_plan_id on public.shopping_list_items (source_plan_id);

-- ============================================================================
-- updated_at TRIGGERS
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create trigger trg_usage_counters_updated_at
  before update on public.usage_counters
  for each row execute function public.set_updated_at();

-- ============================================================================
-- auth.users -> profiles + subscriptions bootstrap trigger
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, status)
  values (new.id, 'free')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Atomic usage-metering RPC
-- ============================================================================

create or replace function public.increment_generation_usage(p_user_id uuid, p_period text)
returns int
language sql
security definer
set search_path = public
as $$
  insert into public.usage_counters (user_id, period, generation_count, updated_at)
  values (p_user_id, p_period, 1, now())
  on conflict (user_id, period)
  do update set generation_count = public.usage_counters.generation_count + 1,
                updated_at = now()
  returning generation_count;
$$;

revoke all on function public.increment_generation_usage(uuid, text) from public;
grant execute on function public.increment_generation_usage(uuid, text) to service_role;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.taste_events enable row level security;
alter table public.pantry_items enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meal_plan_entries enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;

-- profiles: id = auth.uid()
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());
create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_delete_own on public.profiles
  for delete using (id = auth.uid());

-- recipes: user_id = auth.uid()
create policy recipes_select_own on public.recipes
  for select using (user_id = auth.uid());
create policy recipes_insert_own on public.recipes
  for insert with check (user_id = auth.uid());
create policy recipes_update_own on public.recipes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy recipes_delete_own on public.recipes
  for delete using (user_id = auth.uid());

-- taste_events: user_id = auth.uid()
create policy taste_events_select_own on public.taste_events
  for select using (user_id = auth.uid());
create policy taste_events_insert_own on public.taste_events
  for insert with check (user_id = auth.uid());
create policy taste_events_update_own on public.taste_events
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy taste_events_delete_own on public.taste_events
  for delete using (user_id = auth.uid());

-- pantry_items: user_id = auth.uid()
create policy pantry_items_select_own on public.pantry_items
  for select using (user_id = auth.uid());
create policy pantry_items_insert_own on public.pantry_items
  for insert with check (user_id = auth.uid());
create policy pantry_items_update_own on public.pantry_items
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy pantry_items_delete_own on public.pantry_items
  for delete using (user_id = auth.uid());

-- meal_plans: user_id = auth.uid()
create policy meal_plans_select_own on public.meal_plans
  for select using (user_id = auth.uid());
create policy meal_plans_insert_own on public.meal_plans
  for insert with check (user_id = auth.uid());
create policy meal_plans_update_own on public.meal_plans
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy meal_plans_delete_own on public.meal_plans
  for delete using (user_id = auth.uid());

-- meal_plan_entries: no direct user_id column -> gate via parent meal_plans.user_id
create policy meal_plan_entries_select_own on public.meal_plan_entries
  for select using (
    exists (
      select 1 from public.meal_plans mp
      where mp.id = meal_plan_entries.plan_id and mp.user_id = auth.uid()
    )
  );
create policy meal_plan_entries_insert_own on public.meal_plan_entries
  for insert with check (
    exists (
      select 1 from public.meal_plans mp
      where mp.id = meal_plan_entries.plan_id and mp.user_id = auth.uid()
    )
  );
create policy meal_plan_entries_update_own on public.meal_plan_entries
  for update using (
    exists (
      select 1 from public.meal_plans mp
      where mp.id = meal_plan_entries.plan_id and mp.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.meal_plans mp
      where mp.id = meal_plan_entries.plan_id and mp.user_id = auth.uid()
    )
  );
create policy meal_plan_entries_delete_own on public.meal_plan_entries
  for delete using (
    exists (
      select 1 from public.meal_plans mp
      where mp.id = meal_plan_entries.plan_id and mp.user_id = auth.uid()
    )
  );

-- shopping_list_items: user_id = auth.uid()
create policy shopping_list_items_select_own on public.shopping_list_items
  for select using (user_id = auth.uid());
create policy shopping_list_items_insert_own on public.shopping_list_items
  for insert with check (user_id = auth.uid());
create policy shopping_list_items_update_own on public.shopping_list_items
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy shopping_list_items_delete_own on public.shopping_list_items
  for delete using (user_id = auth.uid());

-- subscriptions: user may SELECT own row only; writes are service_role only
-- (service_role connections bypass RLS entirely, so no write policies are defined here
--  on purpose -- authenticated/anon roles get no INSERT/UPDATE/DELETE path.)
create policy subscriptions_select_own on public.subscriptions
  for select using (user_id = auth.uid());

-- usage_counters: user may SELECT own row only; writes are service_role only (see above)
create policy usage_counters_select_own on public.usage_counters
  for select using (user_id = auth.uid());
