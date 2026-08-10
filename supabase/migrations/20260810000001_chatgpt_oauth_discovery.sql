-- ChatGPT Plugin OAuth Discovery — PKCE + Dynamic Client Registration
--
-- Adds the columns and table needed to support:
--   - PKCE (RFC 7636) on the authorization code grant
--   - Dynamic Client Registration (RFC 7591), used by MCP clients (like
--     ChatGPT) that auto-provision a client_id via POST /register instead
--     of a developer manually pasting one into a form.

alter table chatgpt_oauth_codes
  add column client_id text,
  add column code_challenge text,
  add column code_challenge_method text;

create table chatgpt_oauth_clients (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique,
  client_name text,
  redirect_uris text[] not null,
  token_endpoint_auth_method text not null default 'none',
  grant_types text[] not null default array['authorization_code', 'refresh_token'],
  response_types text[] not null default array['code'],
  created_at timestamp with time zone not null default now()
);

create index chatgpt_oauth_clients_client_id on chatgpt_oauth_clients(client_id);

-- Locked down: only the edge function (service role) reads/writes this
-- table. No policies are defined, so RLS denies all access via the
-- anon/authenticated API roles.
alter table chatgpt_oauth_clients enable row level security;

-- Recreate the code-exchange function so it also returns the PKCE
-- challenge (and client_id) alongside the existing user_id/state, so the
-- edge function can verify the code_verifier before issuing tokens.
create or replace function exchange_oauth_code(
  p_code text,
  p_redirect_uri text
)
returns json as $$
declare
  v_code_record record;
  v_now timestamp with time zone := now();
begin
  select * into v_code_record
  from chatgpt_oauth_codes
  where code = p_code
  and not used
  and expires_at > v_now;

  if v_code_record is null then
    return json_build_object('error', 'Invalid or expired authorization code');
  end if;

  if v_code_record.redirect_uri != p_redirect_uri then
    return json_build_object('error', 'Redirect URI mismatch');
  end if;

  update chatgpt_oauth_codes
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
$$ language plpgsql;
