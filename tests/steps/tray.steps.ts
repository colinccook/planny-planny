import { createBdd } from 'playwright-bdd';
import { test } from '../support/fixtures';

const { Given, When, Then } = createBdd(test);

Given('I open a page with a tray component', async ({ page }) => {
  await page.setContent(`
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: sans-serif; }
        .hidden { display: none; }
        .backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 50;
        }
        .tray-panel {
          position: fixed; top: 0; left: 0; right: 0;
          max-height: 90vh; background: white; border-radius: 0 0 16px 16px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15); z-index: 51;
          transform: translateY(0); transition: transform 300ms ease-out;
        }
        .tray-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          padding: 16px 16px 8px;
        }
        .tray-title { font-size: 18px; font-weight: bold; }
        .tray-description { font-size: 14px; color: #666; margin-top: 4px; }
        .close-btn {
          background: none; border: none; padding: 8px; cursor: pointer;
          font-size: 18px; border-radius: 50%;
        }
        .close-btn:hover { background: #f0f0f0; }
        .tray-content { padding: 0 16px 8px; }
        .tray-handle {
          display: flex; justify-content: center; padding: 12px;
        }
        .handle-bar {
          width: 40px; height: 4px; border-radius: 2px; background: #d1d5db;
        }
        .trigger-btn {
          margin: 20px; padding: 12px 24px; background: #059669; color: white;
          border: none; border-radius: 8px; font-size: 16px; cursor: pointer;
        }
      </style>
    </head>
    <body>
      <button class="trigger-btn" data-testid="trigger-button">Open Tray</button>

      <div id="tray-container" class="hidden">
        <div class="backdrop" data-testid="tray-backdrop" onclick="closeTray()"></div>
        <div class="tray-panel" data-testid="tray-panel" id="tray-panel">
          <div class="tray-header">
            <div>
              <div class="tray-title" data-testid="tray-title">Test Tray</div>
              <div class="tray-description" data-testid="tray-description">A helpful description</div>
            </div>
            <button class="close-btn" data-testid="tray-close-button" aria-label="Close tray" onclick="closeTray()">✕</button>
          </div>
          <div class="tray-content">
            <p>Tray content goes here</p>
          </div>
          <div class="tray-handle" data-testid="tray-handle">
            <div class="handle-bar"></div>
          </div>
        </div>
      </div>

      <script>
        const container = document.getElementById('tray-container');
        const panel = document.getElementById('tray-panel');
        let startY = 0;
        let currentY = 0;

        document.querySelector('[data-testid="trigger-button"]').addEventListener('click', function() {
          container.classList.remove('hidden');
        });

        function closeTray() {
          container.classList.add('hidden');
        }

        panel.addEventListener('touchstart', function(e) {
          startY = e.touches[0].clientY;
        });

        panel.addEventListener('touchmove', function(e) {
          currentY = e.touches[0].clientY;
          const dy = currentY - startY;
          if (dy > 0) {
            panel.style.transform = 'translateY(' + dy + 'px)';
            panel.style.transition = 'none';
          }
        });

        panel.addEventListener('touchend', function() {
          const dy = currentY - startY;
          panel.style.transition = 'transform 300ms ease-out';
          if (dy > 80) {
            closeTray();
          }
          panel.style.transform = 'translateY(0)';
          startY = 0;
          currentY = 0;
        });
      </script>
    </body>
    </html>
  `);
});

When('I click the trigger button', async ({ page }) => {
  await page.getByTestId('trigger-button').click();
});

When('I click the tray close button', async ({ page }) => {
  await page.getByTestId('tray-close-button').click();
});

When('I click the tray backdrop', async ({ page }) => {
  await page.getByTestId('tray-backdrop').click({ force: true });
});

When('I swipe down on the tray panel', async ({ page }) => {
  const panel = page.getByTestId('tray-panel');
  const box = await panel.boundingBox();
  if (!box) throw new Error('Tray panel not found');

  const startX = box.x + box.width / 2;
  const startY = box.y + 20;

  await page.touchscreen.tap(startX, startY);
  await page.mouse.move(startX, startY);

  // Simulate touch swipe down
  await panel.dispatchEvent('touchstart', {
    touches: [{ clientX: startX, clientY: startY, identifier: 0 }],
  });
  await panel.dispatchEvent('touchmove', {
    touches: [{ clientX: startX, clientY: startY + 150, identifier: 0 }],
  });
  await panel.dispatchEvent('touchend', {
    changedTouches: [{ clientX: startX, clientY: startY + 150, identifier: 0 }],
  });

  await page.waitForTimeout(400);
});

Then('the tray should be visible', async ({ page }) => {
  const container = page.locator('#tray-container');
  const isHidden = await container.evaluate((el) => el.classList.contains('hidden'));
  if (isHidden) throw new Error('Expected tray to be visible');
});

Then('the tray should have a close button', async ({ page }) => {
  await page.getByTestId('tray-close-button').waitFor({ state: 'visible' });
});

Then('the tray should not be visible', async ({ page }) => {
  const container = page.locator('#tray-container');
  const isHidden = await container.evaluate((el) => el.classList.contains('hidden'));
  if (!isHidden) throw new Error('Expected tray to be hidden');
});

Then('the tray should display the title {string}', async ({ page }, title: string) => {
  const trayTitle = page.getByTestId('tray-title');
  await trayTitle.waitFor({ state: 'visible' });
  const text = await trayTitle.textContent();
  if (text !== title) throw new Error(`Expected title "${title}", got "${text}"`);
});

Then('the tray should display the description {string}', async ({ page }, desc: string) => {
  const trayDesc = page.getByTestId('tray-description');
  await trayDesc.waitFor({ state: 'visible' });
  const text = await trayDesc.textContent();
  if (text !== desc) throw new Error(`Expected description "${desc}", got "${text}"`);
});
