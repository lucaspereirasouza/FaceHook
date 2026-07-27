create extension if not exists pgcrypto;

create type public.facebook_connection_status as enum ('connected', 'expired', 'invalid', 'revoked');
create type public.group_status as enum ('active', 'paused', 'error');
create type public.lead_status as enum ('New', 'Reviewed', 'Contacted', 'Converted', 'Ignored');
create type public.urgency as enum ('Low', 'Medium', 'High');
create type public.worker_state as enum ('healthy', 'degraded', 'down');
create type public.log_level as enum ('info', 'warn', 'error');
create type public.job_state as enum ('queued', 'running', 'completed', 'failed', 'cancelled');

create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.facebook_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.app_users(id) on delete cascade,
  facebook_user_id text not null unique,
  facebook_name text,
  access_token_encrypted text not null,
  token_encryption_key_version text not null default 'v1',
  scopes text[] not null default '{}',
  status public.facebook_connection_status not null default 'connected',
  expires_at timestamptz,
  invalidated_at timestamptz,
  last_validated_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint facebook_connection_validity_check check (
    (status = 'connected' and invalidated_at is null)
    or status in ('expired', 'invalid', 'revoked')
  )
);

-- Browser cookies contain only the unhashed opaque token. Persist its SHA-256 digest.
create table public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- OAuth state is single-use and stored hashed for the same reason as session tokens.
create table public.facebook_oauth_states (
  id uuid primary key default gen_random_uuid(),
  state_hash text not null unique,
  redirect_uri text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_users(id) on delete cascade,
  name text not null,
  description text not null default '',
  prompt text not null,
  services text[] not null default '{}',
  keywords text[] not null default '{}',
  negative_keywords text[] not null default '{}',
  locations text[] not null default '{}',
  response_style text not null default '',
  discord_webhook_encrypted text,
  discord_webhook_key_version text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.monitored_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_users(id) on delete cascade,
  facebook_group_id text,
  name text not null,
  url text not null,
  enabled boolean not null default true,
  interval_minutes integer not null default 30 check (interval_minutes between 1 and 1440),
  last_scan_at timestamptz,
  status public.group_status not null default 'paused',
  posts_collected bigint not null default 0 check (posts_collected >= 0),
  errors integer not null default 0 check (errors >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, url),
  unique (owner_id, facebook_group_id)
);

create table public.group_profiles (
  group_id uuid not null references public.monitored_groups(id) on delete cascade,
  profile_id uuid not null references public.business_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);

create table public.facebook_posts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_users(id) on delete cascade,
  group_id uuid not null references public.monitored_groups(id) on delete cascade,
  facebook_post_id text not null,
  author_facebook_id text,
  author_name text not null,
  author_avatar text,
  content text not null,
  attachment_count integer not null default 0 check (attachment_count >= 0),
  attachments jsonb not null default '[]'::jsonb,
  facebook_url text not null,
  collected_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  unique (group_id, facebook_post_id)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_users(id) on delete cascade,
  post_id uuid not null unique references public.facebook_posts(id) on delete cascade,
  group_id uuid not null references public.monitored_groups(id) on delete restrict,
  profile_id uuid references public.business_profiles(id) on delete set null,
  matched_profile_name text not null,
  score smallint not null check (score between 0 and 10),
  confidence numeric(4, 3) not null check (confidence between 0 and 1),
  service text not null,
  location text,
  urgency public.urgency not null default 'Low',
  summary text not null,
  recommended_response text,
  content_info jsonb not null default '{}'::jsonb,
  contact_info text,
  status public.lead_status not null default 'New',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_users(id) on delete cascade,
  name text not null,
  role text not null,
  state public.worker_state not null default 'healthy',
  last_poll_at timestamptz,
  avg_processing_ms integer not null default 0 check (avg_processing_ms >= 0),
  processed_today integer not null default 0 check (processed_today >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_users(id) on delete cascade,
  group_id uuid references public.monitored_groups(id) on delete cascade,
  worker_id uuid references public.workers(id) on delete set null,
  type text not null,
  state public.job_state not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  attempts integer not null default 0 check (attempts >= 0),
  error_message text,
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.worker_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_users(id) on delete cascade,
  worker_id uuid references public.workers(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  level public.log_level not null default 'info',
  message text not null,
  context jsonb not null default '{}'::jsonb,
  logged_at timestamptz not null default now()
);

create index app_sessions_active_user_idx on public.app_sessions (user_id, expires_at) where revoked_at is null;
create index facebook_connections_status_idx on public.facebook_connections (status, expires_at);
create index business_profiles_owner_enabled_idx on public.business_profiles (owner_id, enabled);
create index monitored_groups_owner_status_idx on public.monitored_groups (owner_id, status, enabled);
create index facebook_posts_group_collected_idx on public.facebook_posts (group_id, collected_at desc);
create index leads_owner_created_idx on public.leads (owner_id, created_at desc);
create index leads_filter_idx on public.leads (owner_id, status, urgency, score desc);
create index jobs_queue_idx on public.jobs (owner_id, state, scheduled_at) where state in ('queued', 'running', 'failed');
create index worker_logs_owner_logged_idx on public.worker_logs (owner_id, logged_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger app_users_set_updated_at before update on public.app_users for each row execute function public.set_updated_at();
create trigger facebook_connections_set_updated_at before update on public.facebook_connections for each row execute function public.set_updated_at();
create trigger business_profiles_set_updated_at before update on public.business_profiles for each row execute function public.set_updated_at();
create trigger monitored_groups_set_updated_at before update on public.monitored_groups for each row execute function public.set_updated_at();
create trigger leads_set_updated_at before update on public.leads for each row execute function public.set_updated_at();
create trigger workers_set_updated_at before update on public.workers for each row execute function public.set_updated_at();
create trigger jobs_set_updated_at before update on public.jobs for each row execute function public.set_updated_at();

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.app_users where auth_user_id = auth.uid() limit 1;
$$;

grant execute on function public.current_app_user_id() to authenticated;

alter table public.app_users enable row level security;
alter table public.facebook_connections enable row level security;
alter table public.app_sessions enable row level security;
alter table public.facebook_oauth_states enable row level security;
alter table public.business_profiles enable row level security;
alter table public.monitored_groups enable row level security;
alter table public.group_profiles enable row level security;
alter table public.facebook_posts enable row level security;
alter table public.leads enable row level security;
alter table public.workers enable row level security;
alter table public.jobs enable row level security;
alter table public.worker_logs enable row level security;

create policy app_users_owner_policy on public.app_users
  for all to authenticated using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

create policy business_profiles_owner_policy on public.business_profiles
  for all to authenticated using (owner_id = public.current_app_user_id()) with check (owner_id = public.current_app_user_id());

create policy monitored_groups_owner_policy on public.monitored_groups
  for all to authenticated using (owner_id = public.current_app_user_id()) with check (owner_id = public.current_app_user_id());

create policy group_profiles_owner_policy on public.group_profiles
  for all to authenticated
  using (exists (select 1 from public.monitored_groups where id = group_id and owner_id = public.current_app_user_id()))
  with check (exists (select 1 from public.monitored_groups where id = group_id and owner_id = public.current_app_user_id()));

create policy facebook_posts_owner_policy on public.facebook_posts
  for all to authenticated using (owner_id = public.current_app_user_id()) with check (owner_id = public.current_app_user_id());

create policy leads_owner_policy on public.leads
  for all to authenticated using (owner_id = public.current_app_user_id()) with check (owner_id = public.current_app_user_id());

create policy workers_owner_policy on public.workers
  for all to authenticated using (owner_id = public.current_app_user_id()) with check (owner_id = public.current_app_user_id());

create policy jobs_owner_policy on public.jobs
  for all to authenticated using (owner_id = public.current_app_user_id()) with check (owner_id = public.current_app_user_id());

create policy worker_logs_owner_policy on public.worker_logs
  for all to authenticated using (owner_id = public.current_app_user_id()) with check (owner_id = public.current_app_user_id());

comment on table public.facebook_connections is 'Stores encrypted Facebook access tokens. Encrypt and decrypt only in trusted server code.';
comment on table public.app_sessions is 'Stores hashes of opaque HTTP-only browser session cookies.';
comment on table public.facebook_oauth_states is 'Stores hashes of single-use OAuth state values.';