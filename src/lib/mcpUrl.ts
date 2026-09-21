/**
 * Build the URL of the Planny Planny remote MCP server.
 *
 * The same Streamable HTTP endpoint powers the ChatGPT plugin and Claude
 * custom connectors. It supports OAuth 2.1 dynamic client registration, so
 * clients such as Claude only need this URL and "requires sign-in" turned on
 * — no client ID or client secret.
 *
 * @param supabaseUrl Optional override for the Supabase API origin
 *                    (defaults to `VITE_SUPABASE_URL`).
 */
export function buildMcpServerUrl(
  supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL as string,
): string {
  return `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/chatgpt-plugin/mcp`
}
