import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// Two suites with different guarantees:
// - integration: real React app + real local Supabase container
// - component:   in-step HTML harnesses (page.setContent) — no backend
const integrationTestDir = defineBddConfig({
  features: 'tests/integration/features/**/*.feature',
  steps: 'tests/integration/steps/**/*.ts',
  outputDir: '.features-gen/integration',
});

const componentTestDir = defineBddConfig({
  features: 'tests/component/features/**/*.feature',
  steps: 'tests/component/steps/**/*.ts',
  outputDir: '.features-gen/component',
});

const mobileViewport = {
  browserName: 'chromium' as const,
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
};

export default defineConfig({
  retries: process.env.CI ? 1 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'integration',
      testDir: integrationTestDir,
      use: mobileViewport,
    },
    {
      name: 'component',
      testDir: componentTestDir,
      use: mobileViewport,
    },
  ],
  // The Vite dev server is shared by both projects. Integration tests
  // additionally require a local Supabase stack (`supabase start`); component
  // tests only need the dev server (one harness uses `page.goto('/login')`
  // purely to obtain a real origin for `sessionStorage`).
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
