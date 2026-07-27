create schema if not exists private;

alter function public.current_app_user_id() set schema private;

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke all on function private.current_app_user_id() from public;
grant execute on function private.current_app_user_id() to authenticated;

create policy app_sessions_no_client_access on public.app_sessions
  for all to anon, authenticated using (false) with check (false);

create policy facebook_connections_no_client_access on public.facebook_connections
  for all to anon, authenticated using (false) with check (false);

create policy facebook_oauth_states_no_client_access on public.facebook_oauth_states
  for all to anon, authenticated using (false) with check (false);