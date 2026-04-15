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
        .idea-card { display: flex; justify-content: space-between; padding: 10px; border-radius: 8px; background: #eef2ff; margin-top: 8px; border: 1px solid #c7d2fe; }
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
        <button data-testid="thumbs-up-reaction-button" onclick="reactThumbsUp()">👍 Thumbs up</button>
      </div>

      <script>
        let ideas = [];
        let selectedIdeaId = null;

        function renderIdeas() {
          const list = document.getElementById('ideas-list');
          list.innerHTML = '';
          ideas.forEach((idea) => {
            const el = document.createElement('button');
            el.className = 'idea-card';
            el.setAttribute('data-testid', 'idea-card-' + idea.id);
            el.onclick = () => openIdea(idea.id);
            el.innerHTML = '<span>' + idea.title + '</span><span data-testid="idea-thumbs-' + idea.id + '">👍 ' + idea.thumbs + '</span>';
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
          document.getElementById('reaction-picker-tray').classList.remove('hidden');
        }

        window.reactThumbsUp = function() {
          const idea = ideas.find((i) => i.id === selectedIdeaId);
          if (!idea) return;
          if (!idea.reactors.includes('You')) {
            idea.thumbs += 1;
            idea.reactors.push('You');
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
    const card = page.getByText(ideaTitle)
    await card.waitFor({ state: 'visible' })
    await page.getByText(`👍 ${count}`).waitFor({ state: 'visible' })
  },
)

When(
  'I react to the idea {string} with a thumbs up',
  async ({ page }, ideaTitle: string) => {
    const ideaButton = page.locator(`[data-testid^="idea-card-"]`).filter({
      hasText: ideaTitle,
    })
    await ideaButton.click()
    await page.getByTestId('open-react-to-idea-button').click()
    await page.getByTestId('thumbs-up-reaction-button').click()
  },
)

Then('I should see {string} in the idea reactors list', async ({ page }, name: string) => {
  await page.getByTestId('idea-reactors-list').getByText(name).waitFor({ state: 'visible' })
})
