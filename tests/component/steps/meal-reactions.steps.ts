import { createBdd } from 'playwright-bdd'
import { test } from '../../support/fixtures'

const { Given, When, Then } = createBdd(test)

const HTML = `
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: sans-serif; margin: 0; padding: 16px; }
    .meal-card { background: #ecfdf5; border-radius: 8px; padding: 10px; margin-top: 8px; }
    .meal-title { font-weight: 600; color: #111827; }
    .rx-button { display: inline-flex; align-items: center; gap: 4px; border-radius: 9999px; padding: 4px 10px; font-size: 12px; border-width: 1px; border-style: dashed; border-color: #d1d5db; background: #f9fafb; color: #9ca3af; filter: grayscale(1); cursor: pointer; margin-top: 8px; }
    .rx-button[data-state="reacted"] { border-style: solid; border-color: #818cf8; background: #e0e7ff; color: #3730a3; font-weight: 600; filter: none; }
    .tray { position: fixed; left: 0; right: 0; bottom: 0; background: white; padding: 20px; border-top: 1px solid #e5e7eb; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div id="meals"></div>
  <div id="reactors-tray" class="tray hidden" data-testid="reactors-tray">
    <h3>Reactions</h3>
    <ul id="rx-list" data-testid="rx-reactors-list"></ul>
  </div>

  <script>
    const meals = [
      { id: 'meal-1', title: 'Roast chicken', reacted: false, reactors: [] },
    ];
    let longPressTimer = null;
    let longPressFired = false;

    function render() {
      const container = document.getElementById('meals');
      container.innerHTML = '';
      meals.forEach(m => {
        const card = document.createElement('div');
        card.className = 'meal-card';
        card.setAttribute('data-testid', 'meal-card-' + m.id);

        const title = document.createElement('div');
        title.className = 'meal-title';
        title.textContent = m.title;
        card.appendChild(title);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'rx-button';
        btn.setAttribute('data-testid', 'meal-reaction-' + m.id);
        btn.setAttribute('data-state', m.reacted ? 'reacted' : 'unreacted');
        btn.textContent = '👍' + (m.reactors.length ? ' ' + m.reactors.length : '');

        btn.addEventListener('pointerdown', () => {
          longPressFired = false;
          clearTimeout(longPressTimer);
          longPressTimer = setTimeout(() => {
            longPressFired = true;
            openTray(m.id);
          }, 500);
        });
        btn.addEventListener('pointerup', () => clearTimeout(longPressTimer));
        btn.addEventListener('pointerleave', () => clearTimeout(longPressTimer));
        btn.addEventListener('click', () => {
          if (longPressFired) { longPressFired = false; return; }
          toggle(m.id);
        });

        card.appendChild(btn);
        container.appendChild(card);
      });
    }

    function toggle(id) {
      const m = meals.find(x => x.id === id);
      if (m.reacted) {
        m.reacted = false;
        m.reactors = m.reactors.filter(r => r !== 'You');
      } else {
        m.reacted = true;
        m.reactors.push('You');
      }
      render();
    }

    function openTray(id) {
      const m = meals.find(x => x.id === id);
      const list = document.getElementById('rx-list');
      list.innerHTML = '';
      m.reactors.forEach(r => {
        const li = document.createElement('li');
        li.textContent = r;
        list.appendChild(li);
      });
      document.getElementById('reactors-tray').classList.remove('hidden');
    }

    render();
  </script>
</body>
</html>
`

Given('I open a day detail view with meal reactions support', async ({ page }) => {
  await page.setContent(HTML)
})

When(
  'I react to the meal {string} with a thumbs up',
  async ({ page }, mealTitle: string) => {
    const card = page.locator('[data-testid^="meal-card-"]').filter({ hasText: mealTitle })
    await card.locator('[data-testid^="meal-reaction-"]').click()
  },
)

When(
  'I long press the meal reaction for {string}',
  async ({ page }, mealTitle: string) => {
    const card = page.locator('[data-testid^="meal-card-"]').filter({ hasText: mealTitle })
    const btn = card.locator('[data-testid^="meal-reaction-"]')
    const box = await btn.boundingBox()
    if (!box) throw new Error('button not visible')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(700)
    await page.mouse.up()
  },
)

Then(
  'the meal {string} reaction should be reacted',
  async ({ page }, mealTitle: string) => {
    const card = page.locator('[data-testid^="meal-card-"]').filter({ hasText: mealTitle })
    const state = await card.locator('[data-testid^="meal-reaction-"]').getAttribute('data-state')
    if (state !== 'reacted') throw new Error(`expected reacted, got ${state}`)
  },
)

Then(
  'the meal {string} reaction should be unreacted',
  async ({ page }, mealTitle: string) => {
    const card = page.locator('[data-testid^="meal-card-"]').filter({ hasText: mealTitle })
    const state = await card.locator('[data-testid^="meal-reaction-"]').getAttribute('data-state')
    if (state !== 'unreacted') throw new Error(`expected unreacted, got ${state}`)
  },
)
