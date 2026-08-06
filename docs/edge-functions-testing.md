# Edge Function Testing Guide

## Problem

The CI/CD pipeline was deploying Edge Functions without testing them locally, causing deployment failures that weren't caught until production.

## Solution: Local Testing Workflow

### Prerequisites

```bash
# Start local Supabase (automatically applies all migrations)
supabase start

# Install dependencies (if not already installed)
npm install
```

### Test Edge Functions Locally

```bash
# Run the OAuth endpoint validation tests
./scripts/test-edge-functions-locally.sh
```

This script validates:
- ✅ **Authorization endpoint (`GET /authorize`)** — parameter validation, OAuth redirects
- ✅ **Token endpoint (`POST /token`)** — grant type validation, error handling
- ✅ **Error responses** — correct HTTP status codes (400, 401, 500)

**Example output:**
```
🔍 Testing ChatGPT Plugin OAuth Edge Functions locally...

────────────────────────────────────────────────
GET /authorize (OAuth authorization endpoint)
────────────────────────────────────────────────

Testing Missing redirect_uri... ✓ (HTTP 400)
Testing Redirect to login when missing credentials... ✓ (HTTP 302)
Testing Invalid credentials... ✓ (HTTP 401)

────────────────────────────────────────────────
POST /token (OAuth token endpoint)
────────────────────────────────────────────────

Testing Missing email in password grant... ✓ (HTTP 400)
Testing Missing password... ✓ (HTTP 400)
Testing Missing code... ✓ (HTTP 400)
Testing Missing refresh_token... ✓ (HTTP 400)
Testing Unsupported grant_type... ✓ (HTTP 400)

────────────────────────────────────────────────
Test Results
────────────────────────────────────────────────

Passed: 8
Failed: 0

✓ All local tests passed! Edge Functions are ready.
```

### Full Testing Workflow Before Deploy

```bash
# 1. Start local Supabase
supabase start

# 2. Run all tests (unit, component, integration)
npm run test
npm run test:component
npm run test:integration

# 3. Validate Edge Functions locally
./scripts/test-edge-functions-locally.sh

# 4. Run linting and build
npm run lint
npm run build

# 5. If all pass, push to main
git push origin main
# → CI/CD pipeline will deploy automatically
```

## Why Local Testing is Important

**Without testing:**
- ❌ Deployment fails in CI with cryptic errors
- ❌ Production users affected while fixing
- ❌ Difficult to diagnose (Edge Functions don't run in local test environment)

**With local testing:**
- ✅ Catch errors before CI
- ✅ Quick feedback loop (tests run in seconds)
- ✅ Confident that functions work end-to-end

## How It Works

1. **Local Supabase instance** runs Edge Functions at `http://127.0.0.1:54321/functions/v1/`
2. **Test script** makes HTTP requests to validate behavior
3. **Database migrations** are automatically applied (`supabase start` does this)
4. **OAuth endpoints** are configured in `supabase/config.toml` with `verify_jwt = false`

## Troubleshooting

### "Function not found" error

**Cause:** Local Supabase not running or functions not configured  
**Fix:**
```bash
supabase start
# Then check config.toml has [functions.chatgpt-plugin-auth] section
```

### "Failed to generate authorization code" (500 error)

**Cause:** OAuth tables don't exist  
**Fix:**
```bash
supabase db reset
# This applies all migrations including 20260806000001 and 20260806000002
```

### Tests fail but CI passes

**Cause:** Local environment differs from CI  
**Solution:**
```bash
# Match CI environment variables
VITE_SUPABASE_URL=http://127.0.0.1:54321 \
VITE_SUPABASE_ANON_KEY=$(supabase status | grep "Publishable") \
./scripts/test-edge-functions-locally.sh
```

## Adding New Edge Functions

When you add a new Edge Function:

1. Create it in `supabase/functions/my-function/index.ts`
2. Add config to `supabase/config.toml`:
   ```toml
   [functions.my-function]
   verify_jwt = false  # if public endpoint
   # or
   verify_jwt = true   # if auth required
   ```
3. Add test cases to `./scripts/test-edge-functions-locally.sh`
4. Run local tests before pushing:
   ```bash
   supabase start
   ./scripts/test-edge-functions-locally.sh
   ```

## CI/CD Integration

The GitHub Actions workflow:
1. Runs linting, tests, lighthouse checks
2. On successful main push: applies migrations + deploys Edge Functions
3. Edge Functions tested locally before deployment
4. If `supabase functions deploy` fails in CI, the local tests catch it first

## References

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Local Development Setup](https://supabase.com/docs/guides/local-development)
- [Database Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)
