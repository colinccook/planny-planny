-- Harden the temporary MCP OAuth compatibility bridge from DR-021.

alter table public.chatgpt_oauth_codes enable row level security;

alter table public.chatgpt_oauth_tokens
  add column client_id text;

update public.chatgpt_oauth_tokens
set client_id = 'legacy-custom-gpt'
where client_id is null;

alter table public.chatgpt_oauth_tokens
  alter column client_id set not null,
  alter column client_id set default 'legacy-custom-gpt',
  drop constraint chatgpt_oauth_tokens_user_id_key,
  add constraint chatgpt_oauth_tokens_user_client_key unique (user_id, client_id);

drop policy if exists "Users can only read their own OAuth token"
  on public.chatgpt_oauth_tokens;
drop policy if exists "Users can only update their own OAuth token"
  on public.chatgpt_oauth_tokens;
drop policy if exists "Users can only insert their own OAuth token"
  on public.chatgpt_oauth_tokens;

revoke all on table public.chatgpt_oauth_codes from anon, authenticated;
revoke all on table public.chatgpt_oauth_clients from anon, authenticated;
revoke all on table public.chatgpt_oauth_tokens from anon, authenticated;

revoke execute on function public.generate_oauth_code() from public, anon, authenticated;
revoke execute on function public.exchange_oauth_code(text, text) from public, anon, authenticated;
revoke execute on function public.refresh_chatgpt_oauth_token(uuid, text, timestamptz)
  from public, anon, authenticated;

create or replace function public.exchange_mcp_oauth_code(
  p_code text,
  p_redirect_uri text,
  p_client_id text
)
returns json
language plpgsql
set search_path = public
as $$
declare
  v_code_record public.chatgpt_oauth_codes%rowtype;
begin
  select *
  into v_code_record
  from public.chatgpt_oauth_codes
  where code = p_code
    and not used
    and expires_at > now()
  for update;

  if v_code_record is null then
    return json_build_object('error', 'Invalid or expired authorization code');
  end if;

  if v_code_record.redirect_uri <> p_redirect_uri then
    return json_build_object('error', 'Redirect URI mismatch');
  end if;

  if v_code_record.client_id is distinct from p_client_id then
    return json_build_object('error', 'OAuth client mismatch');
  end if;

  update public.chatgpt_oauth_codes
  set used = true
  where id = v_code_record.id;

  return json_build_object(
    'user_id', v_code_record.user_id,
    'state', v_code_record.state,
    'client_id', v_code_record.client_id,
    'code_challenge', v_code_record.code_challenge,
    'code_challenge_method', v_code_record.code_challenge_method
  );
end;
$$;

revoke execute on function public.exchange_mcp_oauth_code(text, text, text)
  from public, anon, authenticated;
grant execute on function public.exchange_mcp_oauth_code(text, text, text)
  to service_role;
