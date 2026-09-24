-- Ensure each connector refresh token identifies exactly one active grant.

alter table public.chatgpt_oauth_tokens
  add constraint chatgpt_oauth_tokens_refresh_token_key unique (refresh_token);
