-- supabase migration: create appointments and notes schema
-- timestamp: 2025-05-31 14:00:00 UTC
-- description: defines enums for appointment_status and note_author_role; creates appointments and notes tables with constraints, indexes, and rls policies

-- create type if not exists user_role as enum ('client', 'staff');
create type user_role as enum ('client', 'staff');

-- create users table
create table if not exists public.users (
  id uuid primary key,
  first_name varchar not null,
  last_name varchar not null,
  birth_date date not null,
  email varchar not null unique,
  phone varchar not null unique,
  role user_role not null
);

-- enable row level security on users
alter table public.users enable row level security;

-- rls policies for users
-- select policies
create policy "users_select_authenticated" on public.users for select to authenticated using (id = auth.uid());
create policy "users_select_anon" on public.users for select to anon using (false);
-- insert policies
create policy "users_insert_authenticated" on public.users for insert to authenticated with check (id = auth.uid());
create policy "users_insert_anon" on public.users for insert to anon with check (false);
-- update policies
create policy "users_update_authenticated" on public.users for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "users_update_anon" on public.users for update to anon using (false) with check (false);
-- delete policies
create policy "users_delete_authenticated" on public.users for delete to authenticated using (false);
create policy "users_delete_anon" on public.users for delete to anon using (false);

-- enable pg_trgm extension for fuzzy search
create extension if not exists pg_trgm;
-- enable btree_gist extension for exclusion constraints on uuid columns
create extension if not exists btree_gist;

-- gin index for fuzzy search on users full name
create index if not exists users_full_name_trgm_idx on public.users using gin (lower(first_name || ' ' || last_name) gin_trgm_ops);

-- create enum for appointment status
create type appointment_status as enum ('booked', 'blocked', 'cancelled');

-- create enum for note author role
create type note_author_role as enum ('client', 'staff');

-- create appointments table
create table public.appointments (
  id uuid primary key,
  client_id uuid not null references public.users(id) on delete restrict,
  staff_id uuid not null references public.users(id) on delete restrict,
  start_time timestamp not null,
  end_time timestamp not null,
  status appointment_status not null default 'booked',
  cancellation_reason text null,
  created_at timestamp not null default now(),
  constraint chk_cancellation_reason check (status <> 'cancelled' or cancellation_reason is not null)
);

-- enable row level security on appointments
alter table public.appointments enable row level security;

-- rls policies for appointments
-- select policies
create policy "appointments_select_authenticated" on public.appointments for select to authenticated using (true);
create policy "appointments_select_anon" on public.appointments for select to anon using (false);
-- insert policies
create policy "appointments_insert_authenticated" on public.appointments for insert to authenticated with check (true);
create policy "appointments_insert_anon" on public.appointments for insert to anon with check (false);
-- update policies
create policy "appointments_update_authenticated" on public.appointments for update to authenticated using (true) with check (true);
create policy "appointments_update_anon" on public.appointments for update to anon using (false) with check (false);
-- delete policies
create policy "appointments_delete_authenticated" on public.appointments for delete to authenticated using (true);
create policy "appointments_delete_anon" on public.appointments for delete to anon using (false);

-- exclusion constraint to prevent overlapping appointments for same staff
alter table public.appointments
  add constraint appointments_no_overlap exclude using gist (
    staff_id with =,
    tsrange(start_time, end_time) with &&
  );

-- indexes for appointments
create index if not exists appointments_start_time_idx on public.appointments using btree (start_time);
create index if not exists appointments_end_time_idx on public.appointments using btree (end_time);

-- create notes table
create table public.notes (
  id uuid primary key,
  appointment_id uuid not null references public.appointments(id) on delete restrict,
  author_id uuid not null references public.users(id) on delete restrict,
  author_role note_author_role not null,
  content text not null,
  created_at timestamp not null default now()
);

-- enable row level security on notes
alter table public.notes enable row level security;

-- rls policies for notes
-- select policies
create policy "notes_select_authenticated" on public.notes for select to authenticated using (true);
create policy "notes_select_anon" on public.notes for select to anon using (false);
-- insert policies
create policy "notes_insert_authenticated" on public.notes for insert to authenticated with check (true);
create policy "notes_insert_anon" on public.notes for insert to anon with check (false);
-- update policies
create policy "notes_update_authenticated" on public.notes for update to authenticated using (true) with check (true);
create policy "notes_update_anon" on public.notes for update to anon using (false) with check (false);
-- delete policies
create policy "notes_delete_authenticated" on public.notes for delete to authenticated using (true);
create policy "notes_delete_anon" on public.notes for delete to anon using (false);

-- index on notes
create index if not exists notes_appointment_id_idx on public.notes using btree (appointment_id); 