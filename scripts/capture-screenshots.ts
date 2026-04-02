import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(__dirname, '..', 'docs', 'screenshots');

const BASE = 'http://localhost:5173';
const EMAIL = 'test@example.com';
const PASSWORD = 'testpassword123';

async function capture() {
  const browser = await chromium.launch();

  // ============================
  // UNAUTHENTICATED SCREENSHOTS
  // ============================

  // Mobile context
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });

  // Desktop context
  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });

  // 1. Registration Page (mobile)
  const regMobile = await mobile.newPage();
  await regMobile.goto(`${BASE}/register`);
  await regMobile.waitForLoadState('networkidle');
  await regMobile.screenshot({ path: path.join(screenshotDir, '01-register-mobile.png') });
  console.log('✓ 01 Registration page (mobile)');

  // 2. Login Page (mobile)
  const loginMobile = await mobile.newPage();
  await loginMobile.goto(`${BASE}/login`);
  await loginMobile.waitForLoadState('networkidle');
  await loginMobile.screenshot({ path: path.join(screenshotDir, '02-login-mobile.png') });
  console.log('✓ 02 Login page (mobile)');

  // 3. Registration Page (desktop)
  const regDesktop = await desktop.newPage();
  await regDesktop.goto(`${BASE}/register`);
  await regDesktop.waitForLoadState('networkidle');
  await regDesktop.screenshot({ path: path.join(screenshotDir, '03-register-desktop.png') });
  console.log('✓ 03 Registration page (desktop)');

  // 4. Login Page (desktop)
  const loginDesktop = await desktop.newPage();
  await loginDesktop.goto(`${BASE}/login`);
  await loginDesktop.waitForLoadState('networkidle');
  await loginDesktop.screenshot({ path: path.join(screenshotDir, '04-login-desktop.png') });
  console.log('✓ 04 Login page (desktop)');

  // ============================
  // AUTHENTICATED SCREENSHOTS
  // ============================

  // Create authenticated mobile context by logging in
  const authMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });

  const authPage = await authMobile.newPage();
  await authPage.goto(`${BASE}/login`);
  await authPage.waitForLoadState('networkidle');

  // Fill login form
  await authPage.fill('input[type="email"]', EMAIL);
  await authPage.fill('input[type="password"]', PASSWORD);
  await authPage.click('button[type="submit"]');

  // Wait for redirect to calendar after login
  await authPage.waitForURL('**/calendar', { timeout: 10000 });
  await authPage.waitForLoadState('networkidle');
  await authPage.waitForTimeout(2000); // Let data load via realtime

  // 5. Calendar View (mobile) - the main feature
  await authPage.screenshot({ path: path.join(screenshotDir, '05-calendar-mobile.png') });
  console.log('✓ 05 Calendar view (mobile)');

  // 6. Ingredients Tab (mobile)
  await authPage.click('text=Ingredients');
  await authPage.waitForLoadState('networkidle');
  await authPage.waitForTimeout(1500);
  await authPage.screenshot({ path: path.join(screenshotDir, '06-ingredients-mobile.png') });
  console.log('✓ 06 Ingredients tab (mobile)');

  // 7. Settings Tab (mobile)
  await authPage.click('text=Settings');
  await authPage.waitForLoadState('networkidle');
  await authPage.waitForTimeout(1500);
  await authPage.screenshot({ path: path.join(screenshotDir, '07-settings-mobile.png') });
  console.log('✓ 07 Settings tab (mobile)');

  // Create authenticated desktop context
  const authDesktop = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });

  const deskPage = await authDesktop.newPage();
  await deskPage.goto(`${BASE}/login`);
  await deskPage.waitForLoadState('networkidle');
  await deskPage.fill('input[type="email"]', EMAIL);
  await deskPage.fill('input[type="password"]', PASSWORD);
  await deskPage.click('button[type="submit"]');
  await deskPage.waitForURL('**/calendar', { timeout: 10000 });
  await deskPage.waitForLoadState('networkidle');
  await deskPage.waitForTimeout(2000);

  // 8. Calendar View (desktop)
  await deskPage.screenshot({ path: path.join(screenshotDir, '08-calendar-desktop.png') });
  console.log('✓ 08 Calendar view (desktop)');

  // 9. Ingredients Tab (desktop)
  await deskPage.click('text=Ingredients');
  await deskPage.waitForLoadState('networkidle');
  await deskPage.waitForTimeout(1500);
  await deskPage.screenshot({ path: path.join(screenshotDir, '09-ingredients-desktop.png') });
  console.log('✓ 09 Ingredients tab (desktop)');

  // 10. Settings Tab (desktop)
  await deskPage.click('text=Settings');
  await deskPage.waitForLoadState('networkidle');
  await deskPage.waitForTimeout(1500);
  await deskPage.screenshot({ path: path.join(screenshotDir, '10-settings-desktop.png') });
  console.log('✓ 10 Settings tab (desktop)');

  await browser.close();
  console.log(`\nAll 10 screenshots saved to ${screenshotDir}`);
}

capture().catch(console.error);
