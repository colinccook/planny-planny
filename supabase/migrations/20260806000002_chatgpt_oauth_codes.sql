-- OAuth Authorization Codes
-- Store temporary authorization codes for the OAuth code flow

create table chatgpt_oauth_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  state text,
  user_id uuid references auth.users(id) on delete cascade,
  redirect_uri text not null,
  created_at timestamp with time zone not null default now(),
  
  -- Authorization codes expire after 10 minutes
  expires_at timestamp with time zone not null default (now() + interval '10 minutes'),
  
  -- Track if code has been used
  used boolean not null default false
);

-- Index for looking up by code
create index chatgpt_oauth_codes_code on chatgpt_oauth_codes(code);

-- Index for cleanup of expired codes
create index chatgpt_oauth_codes_expires_at on chatgpt_oauth_codes(expires_at);

-- Function to generate a random authorization code
create or replace function generate_oauth_code()
returns text as $$
declare
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  code text := '';
  i int := 0;
begin
  for i in 1..32 loop
    code := code || substr(chars, floor(random() * 62 + 1)::int, 1);
  end loop;
  return code;
end;
$$ language plpgsql;

-- Function to exchange authorization code for tokens
create or replace function exchange_oauth_code(
  p_code text,
  p_redirect_uri text
)
returns json as $$
declare
  v_code_record record;
  v_now timestamp with time zone := now();
begin
  -- Look up the authorization code
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
  
  -- Mark code as used
  update chatgpt_oauth_codes
  set used = true
  where id = v_code_record.id;
  
  -- Return the user_id so the token endpoint can create tokens
  return json_build_object('user_id', v_code_record.user_id, 'state', v_code_record.state);
end;
$$ language plpgsql;
