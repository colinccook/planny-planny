-- ChatGPT Plugin OAuth Token Storage
-- Store refresh tokens for ChatGPT plugin users

create table chatgpt_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  refresh_token text not null,
  access_token text not null,
  access_token_expires_at timestamp with time zone not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  
  -- Ensure one token per user
  unique(user_id)
);

-- Index for looking up by user
create index chatgpt_oauth_tokens_user_id on chatgpt_oauth_tokens(user_id);

-- Enable RLS
alter table chatgpt_oauth_tokens enable row level security;

-- Only the user themselves can read/write their own token
create policy "Users can only read their own OAuth token"
  on chatgpt_oauth_tokens for select
  using (auth.uid() = user_id);

create policy "Users can only update their own OAuth token"
  on chatgpt_oauth_tokens for update
  using (auth.uid() = user_id);

create policy "Users can only insert their own OAuth token"
  on chatgpt_oauth_tokens for insert
  with check (auth.uid() = user_id);

-- Add a function to safely refresh tokens
create or replace function refresh_chatgpt_oauth_token(
  p_user_id uuid,
  p_new_access_token text,
  p_expires_at timestamp with time zone
)
returns void as $$
begin
  update chatgpt_oauth_tokens
  set 
    access_token = p_new_access_token,
    access_token_expires_at = p_expires_at,
    updated_at = now()
  where user_id = p_user_id;
end;
$$ language plpgsql security definer;
