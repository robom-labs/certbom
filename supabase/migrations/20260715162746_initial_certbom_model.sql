-- 자격증봄의 공식 시험 데이터, 사용자 일정, 알림 운영 데이터를 안전하게 저장한다.
create extension if not exists pgcrypto with schema extensions;

create type public.schedule_type as enum ('round', 'rolling', 'announcement');
create type public.time_precision as enum ('exact', 'conventional', 'date-only');
create type public.trust_level as enum ('official-api', 'official-notice', 'manual-review', 'unverified');
create type public.session_status as enum ('scheduled', 'open', 'closed', 'changed', 'cancelled');
create type public.review_status as enum ('pending', 'approved', 'rejected');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'Asia/Seoul',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exams (
  id text primary key,
  slug text not null unique,
  name text not null,
  short_name text,
  category text not null,
  subcategory text,
  organizer_id text not null,
  official_url text not null check (official_url ~ '^https://'),
  application_url text check (application_url is null or application_url ~ '^https://'),
  description text,
  eligibility_summary text,
  schedule_type public.schedule_type not null,
  trust_level public.trust_level not null,
  active boolean not null default true,
  last_verified_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table public.exam_sessions (
  id text primary key,
  exam_id text not null references public.exams(id) on delete cascade,
  year smallint not null check (year between 2000 and 2200),
  round_label text not null,
  region_code text,
  stage text not null check (stage in ('application', 'written', 'practical', 'interview', 'result', 'other')),
  application_open_at timestamptz,
  application_close_at timestamptz,
  exam_start_at timestamptz,
  exam_end_at timestamptz,
  result_at timestamptz,
  admission_ticket_at timestamptz,
  venue_announcement_at timestamptz,
  status public.session_status not null default 'scheduled',
  time_precision public.time_precision not null,
  official_url text not null check (official_url ~ '^https://'),
  source_id text not null,
  source_version text not null,
  source_fingerprint text not null,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  published_at timestamptz,
  last_verified_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (exam_id, year, round_label, region_code, stage)
);

create table public.preparation_items (
  id text primary key,
  exam_id text not null references public.exams(id) on delete cascade,
  session_id text references public.exam_sessions(id) on delete cascade,
  category text not null check (category in ('identity', 'ticket', 'writing', 'calculator', 'tool', 'clothing', 'document', 'forbidden', 'arrival', 'other')),
  label text not null,
  detail text not null,
  required boolean not null,
  official_source_url text not null check (official_source_url ~ '^https://'),
  effective_from date,
  effective_to date,
  published_at timestamptz,
  last_verified_at timestamptz not null
);

create table public.exam_events (
  id text primary key,
  exam_id text not null references public.exams(id) on delete cascade,
  session_id text not null references public.exam_sessions(id) on delete cascade,
  type text not null check (type in ('application-open', 'application-close', 'ticket', 'venue', 'exam', 'result', 'changed', 'cancelled')),
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  time_precision public.time_precision not null,
  official_source_url text not null check (official_source_url ~ '^https://'),
  confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.user_exams (
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id text not null references public.exams(id) on delete cascade,
  session_id text references public.exam_sessions(id) on delete set null,
  notification_preset text not null default 'standard',
  created_at timestamptz not null default now(),
  primary key (user_id, exam_id)
);

create table public.recommendation_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  version text not null,
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  created_at timestamptz not null default now()
);

create table public.recommendation_results (
  profile_id uuid not null references public.recommendation_profiles(id) on delete cascade,
  exam_id text not null references public.exams(id) on delete cascade,
  score integer not null,
  reasons jsonb not null check (jsonb_typeof(reasons) = 'array'),
  cautions jsonb not null check (jsonb_typeof(cautions) = 'array'),
  rule_version text not null,
  primary key (profile_id, exam_id)
);

create table public.preparation_checks (
  user_id uuid not null references auth.users(id) on delete cascade,
  preparation_item_id text not null references public.preparation_items(id) on delete cascade,
  checked boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, preparation_item_id)
);

create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  preset text not null default 'standard',
  quiet_start time not null default '22:00',
  quiet_end time not null default '08:00',
  timezone text not null default 'Asia/Seoul',
  updated_at timestamptz not null default now()
);

create table public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint_hash text not null unique,
  endpoint_ciphertext text not null,
  p256dh_ciphertext text not null,
  auth_ciphertext text not null,
  user_agent text,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.source_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_id text not null,
  fetched_at timestamptz not null default now(),
  raw jsonb not null,
  normalized jsonb,
  validation_report jsonb,
  parser_version text not null,
  fingerprint text not null,
  expires_at timestamptz not null default (now() + interval '90 days'),
  unique (source_id, fingerprint)
);

create table public.change_events (
  id uuid primary key default gen_random_uuid(),
  source_id text not null,
  exam_id text references public.exams(id) on delete set null,
  session_id text references public.exam_sessions(id) on delete set null,
  change_type text not null check (change_type in ('created', 'updated', 'deleted', 'changed', 'cancelled')),
  before_value jsonb,
  after_value jsonb,
  published_at timestamptz,
  detected_at timestamptz not null default now()
);

create table public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_event_id text references public.exam_events(id) on delete cascade,
  kind text not null,
  dedupe_key text not null unique,
  scheduled_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  attempt_count smallint not null default 0 check (attempt_count between 0 and 5),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table public.delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.notification_jobs(id) on delete cascade,
  push_device_id uuid references public.push_devices(id) on delete set null,
  attempted_at timestamptz not null default now(),
  status_code integer,
  result text not null,
  endpoint_hint text,
  error_code text
);

create table public.source_health (
  source_id text primary key,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  next_run_at timestamptz,
  response_count integer not null default 0,
  validation_failure_count integer not null default 0,
  parser_version text not null,
  stale_after interval not null default interval '2 days',
  detail jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.review_queue (
  id uuid primary key default gen_random_uuid(),
  source_id text not null,
  reason text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  payload jsonb not null,
  status public.review_status not null default 'pending',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index exam_sessions_exam_date_idx on public.exam_sessions (exam_id, application_open_at, exam_start_at);
create index exam_events_start_idx on public.exam_events (start_at);
create index notification_jobs_due_idx on public.notification_jobs (status, scheduled_at) where status = 'pending';
create index review_queue_pending_idx on public.review_queue (created_at) where status = 'pending';
create index source_snapshots_retention_idx on public.source_snapshots (expires_at);

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.exams enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.preparation_items enable row level security;
alter table public.exam_events enable row level security;
alter table public.user_exams enable row level security;
alter table public.recommendation_profiles enable row level security;
alter table public.recommendation_results enable row level security;
alter table public.preparation_checks enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_devices enable row level security;
alter table public.source_snapshots enable row level security;
alter table public.change_events enable row level security;
alter table public.notification_jobs enable row level security;
alter table public.delivery_attempts enable row level security;
alter table public.source_health enable row level security;
alter table public.review_queue enable row level security;
alter table public.audit_logs enable row level security;

create policy "공개 시험 읽기" on public.exams for select using (active);
create policy "공개 회차 읽기" on public.exam_sessions for select using (published_at is not null);
create policy "공개 준비물 읽기" on public.preparation_items for select using (published_at is not null);
create policy "확정 일정 읽기" on public.exam_events for select using (confirmed);
create policy "공개 변경 읽기" on public.change_events for select using (published_at is not null);

create policy "본인 프로필 읽기" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "본인 프로필 수정" on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "본인 관심 시험 관리" on public.user_exams for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "본인 추천 프로필 관리" on public.recommendation_profiles for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "본인 추천 결과 관리" on public.recommendation_results for all to authenticated
  using (exists (select 1 from public.recommendation_profiles p where p.id = profile_id and p.user_id = (select auth.uid())))
  with check (exists (select 1 from public.recommendation_profiles p where p.id = profile_id and p.user_id = (select auth.uid())));
create policy "본인 준비 체크 관리" on public.preparation_checks for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "본인 알림 설정 관리" on public.notification_preferences for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "본인 푸시 기기 관리" on public.push_devices for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "본인 알림 작업 읽기" on public.notification_jobs for select to authenticated using ((select auth.uid()) = user_id);
create policy "본인 발송 이력 읽기" on public.delivery_attempts for select to authenticated
  using (exists (select 1 from public.notification_jobs j where j.id = job_id and j.user_id = (select auth.uid())));

create policy "관리자 원본 읽기" on public.source_snapshots for select to authenticated using (public.is_admin());
create policy "관리자 상태 읽기" on public.source_health for select to authenticated using (public.is_admin());
create policy "관리자 검토함 관리" on public.review_queue for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "관리자 감사 로그 읽기" on public.audit_logs for select to authenticated using (public.is_admin());

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.exams, public.exam_sessions, public.preparation_items, public.exam_events, public.change_events to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_exams, public.recommendation_profiles, public.recommendation_results, public.preparation_checks, public.notification_preferences, public.push_devices to authenticated;
grant select on public.notification_jobs, public.delivery_attempts, public.source_snapshots, public.source_health, public.review_queue, public.audit_logs to authenticated;
grant insert, update, delete on public.review_queue to authenticated;
grant execute on function public.is_admin() to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
