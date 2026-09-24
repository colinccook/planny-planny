# !OAuthBridgePage

Claude's dedicated OAuth approval surface.

## Purpose and value

`!OAuthBridgePage` shows the dynamically registered client, requested
permissions and callback host before the user approves or denies access. On
approval it asks the user to confirm their password directly with Supabase,
creating a separate connector session that can be revoked without signing the
browser out or changing the ChatGPT plugin's native OAuth grants.

## Source and lookup

- [Authoritative source: `OAuthBridgePage.tsx`](../../src/pages/OAuthBridgePage.tsx)
- [Search all `!OAuthBridgePage` references](https://github.com/colinccook/planny-planny/search?q=!OAuthBridgePage&type=code)
- [Find tests that render or drive it](https://github.com/colinccook/planny-planny/search?q=!OAuthBridgePage+repo%3Acolinccook%2Fplanny-planny&type=code)
- [Canonical !UiComponents index](../ui-components.md)

## User states

- Invalid or incomplete authorization request.
- Signed-out hand-off to `/login` with a safe in-app return path.
- Approval details with password confirmation.
- Approving or denying in progress.
- Explicit authorization error.

## Screenshot

![Claude OAuth approval at 390×844](../screenshots/claude-integration/02-oauth-approval-mobile.png)

## Maintenance

Keep the `@ClaudeIntegration` unit and integration BDD scenarios, the
password-confirmation explanation, callback host and revocation journey
current whenever this page changes.
