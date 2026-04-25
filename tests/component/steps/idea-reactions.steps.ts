import { createBdd } from 'playwright-bdd'
import { test } from '../../support/fixtures'

const { Given, When, Then } = createBdd(test)

Given('I open a day detail view with ideas support', async ({ page }) => {
  await page.setContent(`
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        body { font-family: sans-serif; margin: 0; padding: 16px; }
        .hidden { display: none; }
        .idea-card { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-radius: 8px; background: #eef2ff; margin-top: 8px; border: 1px solid #c7d2fe; }
        .idea-title { background: transparent; border: 0; text-align: left; flex: 1; font-size: 14px; padding: 0; }
        .pill { border-radius: 999px; padding: 4px 10px; border: 1px dashed #d1d5db; background: #f9fafb; color: #9ca3af; font-weight: 500; filter: grayscale(1); }
        .pill.active { border-style: solid; border-color: #818cf8; background: #e0e7ff; color: #3730a3; font-weight: 700; filter: none; }
        .count-bold { font-weight: 700; }
        .tray { position: fixed; left: 0; right: 0; bottom: 0; background: white; border-top: 1px solid #e5e7eb; padding: 16px; box-shadow: 0 -4px 12px rgba(0,0,0,0.1); }
      </style>
    </head>
    <body>
      <button data-testid="add-idea-button" onclick="openAddIdea()">+ Add idea</button>

      <div id="add-idea-tray" class="hidden">
        <input data-testid="meal-idea-input" id="meal-idea-input" />
        <button data-testid="save-idea-button" onclick="saveIdea()">Save idea</button>
      </div>

      <div id="ideas-list" data-testid="ideas-list"></div>

      <div id="reactors-tray" class="tray hidden" data-testid="reactors-tray">
        <h3>Reactions</h3>
        <ul data-testid="idea-reactors-list" id="reactors-list"></ul>
        <button onclick="closeReactorsTray()">Close</button>
      </div>

      <script>
        let ideas = [];
        let longPressTimer = null;
        let longPressFired = false;

        function renderIdeas() {
          const list = document.getElementById('ideas-list');
          list.innerHTML = '';
          ideas.forEach((idea) => {
            const el = document.createElement('div');
            el.className = 'idea-card';
            el.setAttribute('data-testid', 'idea-card-' + idea.id);

            const title = document.createElement('button');
            title.type = 'button';
            title.className = 'idea-title';
            title.textContent = idea.title;
            el.appendChild(title);

            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = idea.reactors.includes('You') ? 'pill active' : 'pill';
            pill.setAttribute('data-testid', 'idea-reaction-pill-' + idea.id);
            pill.textContent = '👍';

            pill.addEventListener('pointerdown', () => {
              longPressFired = false;
              clearTimeout(longPressTimer);
              longPressTimer = setTimeout(() => {
                longPressFired = true;
                openReactorsTray(idea.id);
              }, 500);
            });
            pill.addEventListener('pointerup', () => clearTimeout(longPressTimer));
            pill.addEventListener('pointerleave', () => clearTimeout(longPressTimer));
            pill.addEventListener('click', () => {
              if (longPressFired) { longPressFired = false; return; }
              toggleThumb(idea.id);
            });

            if (idea.thumbs > 0) {
              const countEl = document.createElement('span');
              countEl.setAttribute('data-testid', 'idea-thumbs-count-' + idea.id);
              countEl.className = idea.reactors.includes('You') ? 'count-bold' : '';
              countEl.textContent = ' ' + idea.thumbs;
              pill.appendChild(countEl);
            }

            el.appendChild(pill);
            list.appendChild(el);
          });
        }

        window.openAddIdea = function() {
          document.getElementById('add-idea-tray').classList.remove('hidden');
        }

        window.saveIdea = function() {
          const input = document.getElementById('meal-idea-input');
          const title = input.value.trim();
          if (!title) return;
          ideas.push({ id: 'idea-' + (ideas.length + 1), title, thumbs: 0, reactors: [] });
          input.value = '';
          document.getElementById('add-idea-tray').classList.add('hidden');
          renderIdeas();
        }

        function toggleThumb(id) {
          const idea = ideas.find((i) => i.id === id);
          if (!idea) return;
          if (idea.reactors.includes('You')) {
            idea.thumbs -= 1;
            idea.reactors = idea.reactors.filter((n) => n !== 'You');
          } else {
            idea.thumbs += 1;
            idea.reactors.push('You');
          }
          renderIdeas();
        }

        function openReactorsTray(id) {
          const idea = ideas.find((i) => i.id === id);
          const list = document.getElementById('reactors-list');
          list.innerHTML = '';
          idea.reactors.forEach((name) => {
            const li = document.createElement('li');
            li.textContent = name;
            list.appendChild(li);
          });
          document.getElementById('reactors-tray').classList.remove('hidden');
        }
        window.closeReactorsTray = function() {
          document.getElementById('reactors-tray').classList.add('hidden');
        }
      </script>
    </body>
    </html>
  `)
})

When('I add the idea {string}', async ({ page }, ideaTitle: string) => {
  await page.getByTestId('add-idea-button').click()
  await page.getByTestId('meal-idea-input').fill(ideaTitle)
  await page.getByTestId('save-idea-button').click()
})

Then(
  'I should see the idea {string} with {string} thumbs up',
  async ({ page }, ideaTitle: string, count: string) => {
    const ideaButton = page.locator(`[data-testid^="idea-card-"]`).filter({
      hasText: ideaTitle,
    })
    await ideaButton.waitFor({ state: 'visible' })
    const countEl = ideaButton.locator('[data-testid^="idea-thumbs-count-"]')
    await countEl.waitFor({ state: 'visible' })
    const text = await countEl.textContent()
    if (text?.trim() !== count) {
      throw new Error(`Expected thumbs count ${count}, got ${text}`)
    }
  },
)

When(
  'I react to the idea {string} with a thumbs up',
  async ({ page }, ideaTitle: string) => {
    const ideaButton = page.locator(`[data-testid^="idea-card-"]`).filter({
      hasText: ideaTitle,
    })
    await ideaButton.locator('[data-testid^="idea-reaction-pill-"]').click()
  },
)

When(
  'I long press the reaction pill for {string}',
  async ({ page }, ideaTitle: string) => {
    const ideaCard = page.locator(`[data-testid^="idea-card-"]`).filter({
      hasText: ideaTitle,
    })
    const pill = ideaCard.locator('[data-testid^="idea-reaction-pill-"]')
    const box = await pill.boundingBox()
    if (!box) throw new Error('pill not visible')
    const x = box.x + box.width / 2
    const y = box.y + box.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.waitForTimeout(700)
    await page.mouse.up()
  },
)

Then('I should see {string} in the idea reactors list', async ({ page }, name: string) => {
  await page.getByTestId('idea-reactors-list').getByText(name).waitFor({ state: 'visible' })
})

Then('I should see the idea {string} with a faded thumbs-up pill', async ({ page }, ideaTitle: string) => {
  const ideaButton = page.locator(`[data-testid^="idea-card-"]`).filter({
    hasText: ideaTitle,
  })
  await ideaButton.waitFor({ state: 'visible' })
  const pill = ideaButton.locator('[data-testid^="idea-reaction-pill-"]')
  const klass = await pill.getAttribute('class')
  if (!klass?.includes('pill') || klass.includes('active')) {
    throw new Error(`Expected faded pill class, got "${klass}"`)
  }
})

Then('the thumbs-up count should be bold for {string}', async ({ page }, ideaTitle: string) => {
  const ideaButton = page.locator(`[data-testid^="idea-card-"]`).filter({
    hasText: ideaTitle,
  })
  const countEl = ideaButton.locator('[data-testid^="idea-thumbs-count-"]')
  const klass = await countEl.getAttribute('class')
  if (!klass?.includes('count-bold')) {
    throw new Error(`Expected bold count class, got "${klass}"`)
  }
})

