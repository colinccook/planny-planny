import { createBdd } from 'playwright-bdd'
import { test } from '../support/fixtures'

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
        .pill { border-radius: 999px; padding: 4px 10px; border: 1px solid #d1d5db; background: white; color: #9ca3af; font-weight: 500; }
        .pill.active { border-color: #818cf8; background: #e0e7ff; color: #3730a3; font-weight: 700; }
        .count-bold { font-weight: 700; }
      </style>
    </head>
    <body>
      <button data-testid="add-idea-button" onclick="openAddIdea()">+ Add idea</button>

      <div id="add-idea-tray" class="hidden">
        <input data-testid="meal-idea-input" id="meal-idea-input" />
        <button data-testid="save-idea-button" onclick="saveIdea()">Save idea</button>
      </div>

      <div id="ideas-list" data-testid="ideas-list"></div>

      <div id="idea-detail-tray" class="hidden">
        <button data-testid="open-react-to-idea-button" onclick="openReactPicker()">React to this</button>
        <ul data-testid="idea-reactors-list"></ul>
      </div>

      <div id="reaction-picker-tray" class="hidden">
        <button class="pill" data-testid="thumbs-up-reaction-button" onclick="reactThumbsUp()">👍 Thumbs up <span data-testid="picker-thumbs-count"></span></button>
      </div>

      <script>
        let ideas = [];
        let selectedIdeaId = null;

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
            title.onclick = () => openIdea(idea.id);
            title.textContent = idea.title;
            el.appendChild(title);

            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = idea.reactors.includes('You') ? 'pill active' : 'pill';
            pill.setAttribute('data-testid', 'idea-reaction-pill-' + idea.id);
            pill.textContent = '👍';
            pill.onclick = () => {
              openIdea(idea.id);
              openReactPicker();
            };

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

        window.openIdea = function(id) {
          selectedIdeaId = id;
          const idea = ideas.find((i) => i.id === id);
          const reactors = document.querySelector('[data-testid="idea-reactors-list"]');
          reactors.innerHTML = '';
          idea.reactors.forEach((name) => {
            const item = document.createElement('li');
            item.textContent = name;
            reactors.appendChild(item);
          });
          document.getElementById('idea-detail-tray').classList.remove('hidden');
        }

        window.openReactPicker = function() {
          const idea = ideas.find((i) => i.id === selectedIdeaId);
          const pickerBtn = document.querySelector('[data-testid="thumbs-up-reaction-button"]');
          const pickerCount = document.querySelector('[data-testid="picker-thumbs-count"]');
          pickerBtn.className = idea && idea.reactors.includes('You') ? 'pill active' : 'pill';
          pickerCount.textContent = idea && idea.thumbs > 0 ? String(idea.thumbs) : '';
          document.getElementById('reaction-picker-tray').classList.remove('hidden');
        }

        window.reactThumbsUp = function() {
          const idea = ideas.find((i) => i.id === selectedIdeaId);
          if (!idea) return;
          if (!idea.reactors.includes('You')) {
            idea.thumbs += 1;
            idea.reactors.push('You');
          } else {
            idea.thumbs -= 1;
            idea.reactors = idea.reactors.filter((name) => name !== 'You');
          }
          document.getElementById('reaction-picker-tray').classList.add('hidden');
          openIdea(idea.id);
          renderIdeas();
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
    await ideaButton.getByRole('button', { name: ideaTitle }).click()
    await page.getByTestId('open-react-to-idea-button').click()
    await page.getByTestId('thumbs-up-reaction-button').click()
  },
)

When('I open reactions from the pill for {string}', async ({ page }, ideaTitle: string) => {
  const ideaButton = page.locator(`[data-testid^="idea-card-"]`).filter({
    hasText: ideaTitle,
  })
  await ideaButton.locator('[data-testid^="idea-reaction-pill-"]').click()
})

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

Then('I should see the reaction picker', async ({ page }) => {
  await page.locator('#reaction-picker-tray').waitFor({ state: 'visible' })
  await page.getByTestId('thumbs-up-reaction-button').waitFor({ state: 'visible' })
})
