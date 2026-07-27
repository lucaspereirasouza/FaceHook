create index facebook_posts_owner_id_idx on public.facebook_posts (owner_id);
create index group_profiles_profile_id_idx on public.group_profiles (profile_id);
create index jobs_group_id_idx on public.jobs (group_id);
create index jobs_worker_id_idx on public.jobs (worker_id);
create index leads_group_id_idx on public.leads (group_id);
create index leads_profile_id_idx on public.leads (profile_id);
create index worker_logs_job_id_idx on public.worker_logs (job_id);
create index worker_logs_worker_id_idx on public.worker_logs (worker_id);

alter policy app_users_owner_policy on public.app_users
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));