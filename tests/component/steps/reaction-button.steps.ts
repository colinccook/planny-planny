import { createBdd } from 'playwright-bdd'
import { test } from '../../support/fixtures'

const { Given, When, Then } = createBdd(test)

const BUTTON_HTML = `
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: sans-serif; margin: 0; padding: 24px; background: #fff; }
    .rx-button { display: inline-flex; align-items: center; gap: 4px; border-radius: 9999px; padding: 6px 12px; font-size: 14px; border-width: 1px; border-style: dashed; border-color: #d1d5db; background: #f9fafb; color: #9ca3af; filter: grayscale(1); cursor: pointer; }
    .rx-button[data-state="reacted"] { border-style: solid; border-color: #818cf8; background: #e0e7ff; color: #3730a3; font-weight: 600; filter: none; }
    .count-bold { font-weight: 700; }
    .hidden { display: none; }
    .tray { position: fixed; left: 0; right: 0; bottom: 0; background: white; padding: 20px; border-top: 1px solid #e5e7eb; box-shadow: 0 -4px 12px rgba(0,0,0,0.1); }
    .picker { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 8px; display: flex; gap: 4px; background: white; border: 1px solid #e5e7eb; border-radius: 9999px; padding: 4px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .picker button { border: 0; background: transparent; font-size: 18px; padding: 4px 8px; cursor: pointer; }
    .relative { position: relative; display: inline-block; }
  </style>
</head>
<body>
  <h1>Reaction Button Demo</h1>

  <section>
    <h2>Single-option button</h2>
    <div class="relative">
      <button id="single-btn" class="rx-button" data-testid="rx-single" data-state="unreacted">
        <span>👍</span>
        <span id="single-count" class="hidden" data-testid="rx-single-count"></span>
      </button>
    </div>
  </section>

  <section>
    <h2>Multi-option button</h2>
    <div class="relative">
      <button id="multi-btn" class="rx-button" data-testid="rx-multi" data-state="unreacted">
        <span id="multi-emoji">👍</span>
        <span id="multi-count" class="hidden" data-testid="rx-multi-count"></span>
      </button>
      <div id="multi-picker" class="picker hidden" data-testid="rx-multi-picker">
        <button onclick="pickMulti('👍')" aria-label="Thumbs up">👍</button>
        <button onclick="pickMulti('❤️')" aria-label="Love">❤️</button>
      </div>
    </div>
  </section>

  <div id="reactors-tray" class="tray hidden" data-testid="reactors-tray">
    <h3>Reactions</h3>
    <ul id="reactors-list" data-testid="rx-reactors-list"></ul>
    <button onclick="closeTray()">Close</button>
  </div>

  <script>
    const state = {
      single: { reacted: false, reactors: [{ id:'a', displayName:'Alex', emoji:'👍' }] },
      multi: { reacted: null, reactors: [] },
    };
    let longPressTimer = null;
    let longPressFired = false;

    function render(kind) {
      const btn = document.getElementById(kind + '-btn');
      const countEl = document.getElementById(kind + '-count');
      const s = state[kind];
      const reactedEmoji = kind === 'single' ? (s.reacted ? '👍' : null) : s.reacted;
      btn.setAttribute('data-state', reactedEmoji ? 'reacted' : 'unreacted');
      const myReactor = s.reactors.find(r => r.isCurrentUser);
      const count = s.reactors.length;
      if (count > 0) {
        countEl.classList.remove('hidden');
        countEl.textContent = count;
        countEl.className = (myReactor ? 'count-bold' : '') + (count > 0 ? '' : ' hidden');
        if (count === 0) countEl.classList.add('hidden');
      } else {
        countEl.classList.add('hidden');
      }
      if (kind === 'multi') {
        document.getElementById('multi-emoji').textContent = reactedEmoji || '👍';
      }
    }

    function react(kind, emoji) {
      const s = state[kind];
      s.reacted = kind === 'single' ? true : emoji;
      s.reactors.push({ id:'me', displayName:'You', emoji: emoji, isCurrentUser: true });
      render(kind);
    }
    function unreact(kind) {
      const s = state[kind];
      s.reacted = kind === 'single' ? false : null;
      s.reactors = s.reactors.filter(r => !r.isCurrentUser);
      render(kind);
    }

    function startLongPress(kind) {
      longPressFired = false;
      clearTimeout(longPressTimer);
      longPressTimer = setTimeout(() => {
        longPressFired = true;
        openReactorsTray(kind);
      }, 500);
    }
    function endLongPress() {
      clearTimeout(longPressTimer);
    }

    function handleTap(kind) {
      if (longPressFired) { longPressFired = false; return; }
      const s = state[kind];
      const hasReacted = kind === 'single' ? s.reacted : s.reacted !== null;
      if (hasReacted) { unreact(kind); return; }
      if (kind === 'single') { react(kind, '👍'); return; }
      document.getElementById('multi-picker').classList.toggle('hidden');
    }

    function pickMulti(emoji) {
      document.getElementById('multi-picker').classList.add('hidden');
      react('multi', emoji);
    }

    function openReactorsTray(kind) {
      const list = document.getElementById('reactors-list');
      list.innerHTML = '';
      state[kind].reactors.forEach(r => {
        const li = document.createElement('li');
        li.textContent = r.displayName + (r.isCurrentUser ? ' (you)' : '');
        list.appendChild(li);
      });
      document.getElementById('reactors-tray').classList.remove('hidden');
    }
    function closeTray() {
      document.getElementById('reactors-tray').classList.add('hidden');
    }

    for (const kind of ['single', 'multi']) {
      const btn = document.getElementById(kind + '-btn');
      btn.addEventListener('pointerdown', () => startLongPress(kind));
      btn.addEventListener('pointerup', endLongPress);
      btn.addEventListener('pointerleave', endLongPress);
      btn.addEventListener('click', () => handleTap(kind));
      render(kind);
    }
  </script>
</body>
</html>
`

Given('I open the reaction button demo', async ({ page }) => {
  await page.setContent(BUTTON_HTML)
})

When('I tap the reaction button {string}', async ({ page }, testId: string) => {
  await page.getByTestId(testId).click()
})

When('I long press the reaction button {string}', async ({ page }, testId: string) => {
  const btn = page.getByTestId(testId)
  const box = await btn.boundingBox()
  if (!box) throw new Error('button not visible')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.waitForTimeout(700)
  await page.mouse.up()
})

Then('the reaction button {string} should be in the reacted state', async ({ page }, testId: string) => {
  const state = await page.getByTestId(testId).getAttribute('data-state')
  if (state !== 'reacted') throw new Error(`expected reacted, got ${state}`)
})

Then('the reaction button {string} should be in the unreacted state', async ({ page }, testId: string) => {
  const state = await page.getByTestId(testId).getAttribute('data-state')
  if (state !== 'unreacted') throw new Error(`expected unreacted, got ${state}`)
})

Then('the reaction picker for {string} should be visible', async ({ page }, testId: string) => {
  await page.getByTestId(`${testId}-picker`).waitFor({ state: 'visible' })
})

Then('the reactors tray should show {string}', async ({ page }, name: string) => {
  const list = page.getByTestId('rx-reactors-list')
  await list.waitFor({ state: 'visible' })
  await list.getByText(name).waitFor({ state: 'visible' })
})

When('I pick the reaction {string}', async ({ page }, label: string) => {
  await page.getByLabel(label).click()
})
