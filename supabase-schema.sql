create extension if not exists "pgcrypto";

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('Admin', 'Executive', 'Department Head')),
  department_id uuid references departments(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles
add constraint profiles_role_check
check (role in ('Admin', 'Executive', 'Department Head'));

create table if not exists weekly_updates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  week_ending date not null,
  created_at timestamptz not null default now(),
  unique (profile_id, week_ending)
);

create table if not exists update_items (
  id uuid primary key default gen_random_uuid(),
  weekly_update_id uuid not null references weekly_updates(id) on delete cascade,
  category text not null check (category in ('activities', 'priorities', 'risks')),
  title text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_department_id on profiles(department_id);
create index if not exists idx_profiles_auth_user_id on profiles(auth_user_id);
create index if not exists idx_weekly_updates_profile_id on weekly_updates(profile_id);
create index if not exists idx_weekly_updates_week_ending on weekly_updates(week_ending desc);
create index if not exists idx_update_items_weekly_update_id on update_items(weekly_update_id);
create index if not exists idx_update_items_category on update_items(category);

grant usage on schema public to authenticated;
grant select on departments to authenticated;
grant select on profiles to authenticated;
grant select, insert, update, delete on weekly_updates to authenticated;
grant select, insert, update, delete on update_items to authenticated;

create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.profiles
  where auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.current_profile_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id
  from public.profiles
  where auth_user_id = auth.uid()
  limit 1
$$;

alter table departments enable row level security;
alter table profiles enable row level security;
alter table weekly_updates enable row level security;
alter table update_items enable row level security;

drop policy if exists "authenticated users can read departments" on departments;
create policy "authenticated users can read departments"
on departments for select
to authenticated
using (true);

drop policy if exists "authenticated users can read profiles" on profiles;
drop policy if exists "users can read allowed profiles" on profiles;
create policy "users can read allowed profiles"
on profiles for select
to authenticated
using (
  auth_user_id = auth.uid()
  or public.current_profile_role() in ('Executive', 'Admin')
);

drop policy if exists "authenticated users can read weekly updates" on weekly_updates;
drop policy if exists "users can read allowed weekly updates" on weekly_updates;
create policy "users can read allowed weekly updates"
on weekly_updates for select
to authenticated
using (
  weekly_updates.profile_id = public.current_profile_id()
  or public.current_profile_role() in ('Executive', 'Admin')
);

drop policy if exists "owners can insert weekly updates" on weekly_updates;
create policy "owners can insert weekly updates"
on weekly_updates for insert
to authenticated
with check (
  weekly_updates.profile_id = public.current_profile_id()
);

drop policy if exists "owners can update weekly updates" on weekly_updates;
create policy "owners can update weekly updates"
on weekly_updates for update
to authenticated
using (
  weekly_updates.profile_id = public.current_profile_id()
)
with check (
  weekly_updates.profile_id = public.current_profile_id()
);

drop policy if exists "owners can delete weekly updates" on weekly_updates;
create policy "owners can delete weekly updates"
on weekly_updates for delete
to authenticated
using (
  weekly_updates.profile_id = public.current_profile_id()
);

drop policy if exists "authenticated users can read update items" on update_items;
drop policy if exists "users can read allowed update items" on update_items;
create policy "users can read allowed update items"
on update_items for select
to authenticated
using (
  exists (
    select 1
    from weekly_updates
    where weekly_updates.id = update_items.weekly_update_id
      and weekly_updates.profile_id = public.current_profile_id()
  )
  or public.current_profile_role() in ('Executive', 'Admin')
);

drop policy if exists "owners can insert update items" on update_items;
create policy "owners can insert update items"
on update_items for insert
to authenticated
with check (
  exists (
    select 1
    from weekly_updates
    where weekly_updates.id = update_items.weekly_update_id
      and weekly_updates.profile_id = public.current_profile_id()
  )
);

drop policy if exists "owners can update update items" on update_items;
create policy "owners can update update items"
on update_items for update
to authenticated
using (
  exists (
    select 1
    from weekly_updates
    where weekly_updates.id = update_items.weekly_update_id
      and weekly_updates.profile_id = public.current_profile_id()
  )
)
with check (
  exists (
    select 1
    from weekly_updates
    where weekly_updates.id = update_items.weekly_update_id
      and weekly_updates.profile_id = public.current_profile_id()
  )
);

drop policy if exists "owners can delete update items" on update_items;
create policy "owners can delete update items"
on update_items for delete
to authenticated
using (
  exists (
    select 1
    from weekly_updates
    where weekly_updates.id = update_items.weekly_update_id
      and weekly_updates.profile_id = public.current_profile_id()
  )
);
