/**
 * Build the URL of the Planny Planny remote MCP server.
 *
 * This is the published ChatGPT resource. Claude uses a separate resource so
 * its temporary OAuth compatibility bridge cannot change ChatGPT's native
 * Supabase OAuth issuer or grants.
 *
 * @param supabaseUrl Optional override for the Supabase API origin
 *                    (defaults to `VITE_SUPABASE_URL`).
 */
export function buildMcpServerUrl(
  supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL as string,
): string {
  return `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/chatgpt-plugin/mcp`
}

export function buildClaudeMcpServerUrl(
  supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL as string,
): string {
  return `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/chatgpt-plugin/claude/mcp`
}

export function buildOAuthCompatibilityServerUrl(
  supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL as string,
): string {
  return `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/chatgpt-plugin-auth`
}
