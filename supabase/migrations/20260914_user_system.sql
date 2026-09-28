-- MEDdonish user system (run in Supabase SQL editor or CLI).
-- Uses auth.users; anon key + RLS only. Do not put service_role in the web app.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  role text not null default 'student' check (role in ('student', 'doctor')),
  avatar_url text,
  university text not null default '',
  faculty text not null default '',
  study_year text not null default '',
  specialty text not null default '',
  country text not null default '',
  language text not null default 'tg' check (language in ('tg', 'ru', 'en')),
  workplace text not null default '',
  interests text[] not null default '{}',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id text not null,
  lesson_id text not null default '',
  progress_percent integer not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  completed boolean not null default false,
  last_position integer not null default 0,
  title text not null default '',
  href text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, course_id, lesson_id)
);

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content_type text not null check (
    content_type in ('lecture', 'video', 'drug', 'test', 'clinical_case', 'course')
  ),
  content_id text not null,
  title text not null default '',
  href text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, content_type, content_id)
);

create table if not exists public.learning_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content_type text not null check (
    content_type in ('lecture', 'video', 'drug', 'test', 'clinical_case', 'course')
  ),
  content_id text not null,
  title text not null default '',
  href text not null default '',
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  last_viewed_at timestamptz not null default now(),
  unique (user_id, content_type, content_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  message text not null default '',
  type text not null default 'system' check (type in ('lesson', 'course', 'test', 'system', 'ai')),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists course_progress_user_idx on public.course_progress (user_id, updated_at desc);
create index if not exists bookmarks_user_idx on public.bookmarks (user_id, created_at desc);
create index if not exists learning_history_user_idx on public.learning_history (user_id, last_viewed_at desc);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists course_progress_set_updated_at on public.course_progress;
create trigger course_progress_set_updated_at
before update on public.course_progress
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, role, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    case when new.raw_user_meta_data ->> 'role' = 'doctor' then 'doctor' else 'student' end,
    coalesce(new.raw_user_meta_data ->> 'language', 'tg')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.course_progress enable row level security;
alter table public.bookmarks enable row level security;
alter table public.learning_history enable row level security;
alter table public.notifications enable row level security;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id);
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists course_progress_select_own on public.course_progress;
drop policy if exists course_progress_insert_own on public.course_progress;
drop policy if exists course_progress_update_own on public.course_progress;
drop policy if exists course_progress_delete_own on public.course_progress;
create policy course_progress_select_own on public.course_progress for select using (auth.uid() = user_id);
create policy course_progress_insert_own on public.course_progress for insert with check (auth.uid() = user_id);
create policy course_progress_update_own on public.course_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy course_progress_delete_own on public.course_progress for delete using (auth.uid() = user_id);

drop policy if exists bookmarks_select_own on public.bookmarks;
drop policy if exists bookmarks_insert_own on public.bookmarks;
drop policy if exists bookmarks_delete_own on public.bookmarks;
create policy bookmarks_select_own on public.bookmarks for select using (auth.uid() = user_id);
create policy bookmarks_insert_own on public.bookmarks for insert with check (auth.uid() = user_id);
create policy bookmarks_delete_own on public.bookmarks for delete using (auth.uid() = user_id);

drop policy if exists learning_history_select_own on public.learning_history;
drop policy if exists learning_history_insert_own on public.learning_history;
drop policy if exists learning_history_update_own on public.learning_history;
create policy learning_history_select_own on public.learning_history for select using (auth.uid() = user_id);
create policy learning_history_insert_own on public.learning_history for insert with check (auth.uid() = user_id);
create policy learning_history_update_own on public.learning_history for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists notifications_select_own on public.notifications;
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_select_own on public.notifications for select using (auth.uid() = user_id);
create policy notifications_update_own on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
