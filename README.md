# 🍽️ Planny Planny

**Perpetual food planning for healthy families.**

Meal planning is hard and easily neglected — it's too easy to skip it and order takeaway instead. Planny Planny helps families collaboratively plan meals, track ingredients for balanced nutrition, and adapt to real life (visitors, events, busy weeks).

## ✨ Features

- **Perpetual Calendar** — A scrolling, mobile-first calendar starting from today. See your meal plan at a glance, plan as far ahead as you like.
- **Collaborative Households** — Create a household, invite your partner or family. Both can add and edit meals. Changes appear instantly via WebSockets.
- **Smart Context** — Each day shows how many adults and children you're cooking for. Add events like "Mum visiting" to adjust the count.
- **Day Placeholders** — Set themes for each day of the week: "Oily Fish Monday", "Veggie Thursday", "Sunday Roast".
- **Ingredient Tracking** — Tag meals with ingredients. Star your favourites. Get reminders when you haven't used a starred ingredient in a while.
- **Ingredient Warnings** — Mark ingredients that you overuse (hello, chicken!). Get prompted when you've already had it in the last 7 days.
- **Public Sharing** — Share a read-only link to your meal plan so visiting family can see what's for dinner.
- **Multiple Households** — Belong to multiple households (e.g., your family + a shared flat). Switch between them easily.
- **Guest Access** — Invite someone as a guest (view-only) or a full member (can edit).

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| Styling | Tailwind CSS (mobile-first) |
| Backend | Supabase (Postgres, Auth, Realtime, RLS) |
| State | TanStack Query + Supabase Realtime (WebSockets) |
| Routing | React Router v7 |
| Unit Testing | Vitest + React Testing Library |
| E2E Testing | Playwright + playwright-bdd (Gherkin BDD) |
| CI/CD | GitHub Actions |

## 📱 Screenshots & User Journeys

### 1. Sign Up & Sign In

New users create an account with a display name, email, and password. A personal household is automatically created for them.

<p align="center">
  <img src="docs/screenshots/01-register-mobile.png" alt="Registration (mobile)" width="280" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/02-login-mobile.png" alt="Login (mobile)" width="280" />
</p>

<details>
<summary>Desktop view</summary>
<p align="center">
  <img src="docs/screenshots/03-register-desktop.png" alt="Registration (desktop)" width="600" />
</p>
<p align="center">
  <img src="docs/screenshots/04-login-desktop.png" alt="Login (desktop)" width="600" />
</p>
</details>

---

### 2. Calendar — Perpetual Meal Plan

The main view is a perpetual scrolling calendar starting from today. Each day shows:
- **Who's eating** — the number of adults 👨 and children 👧 (from household defaults + any visitors)
- **Day theme** — recurring placeholders like "🐟 Oily fish day" or "🍖 Sunday roast"
- **Meals** — each meal shows its title, description, and tagged ingredients as coloured pills
- **⭐ Starred ingredients** — highlighted with a star to encourage variety
- **⚠️ Warning ingredients** — flagged when overused (e.g. Chicken)

Tap **+ Add meal** on any day to plan a new meal.

<p align="center">
  <img src="docs/screenshots/05-calendar-mobile.png" alt="Calendar (mobile)" width="280" />
</p>

<details>
<summary>Desktop view</summary>
<p align="center">
  <img src="docs/screenshots/08-calendar-desktop.png" alt="Calendar (desktop)" width="700" />
</p>
</details>

---

### 3. Ingredients — Track & Balance Your Diet

The Ingredients tab shows your household's full ingredient library with:
- **Usage stats** — how many times each ingredient has been planned and when it was last used
- **⭐ Star** ingredients you want to use regularly (they'll appear in suggestions)
- **⚠️ Warning** flag for ingredients you tend to overuse
- **Sort** by A–Z, most used, or least recently planned
- **Search** to quickly find any ingredient

<p align="center">
  <img src="docs/screenshots/06-ingredients-mobile.png" alt="Ingredients (mobile)" width="280" />
</p>

<details>
<summary>Desktop view</summary>
<p align="center">
  <img src="docs/screenshots/09-ingredients-desktop.png" alt="Ingredients (desktop)" width="700" />
</p>
</details>

---

### 4. Settings — Household Configuration

The Settings tab lets you manage your household:
- **Switch households** — if you belong to multiple households
- **Household settings** — name, alias (e.g. your address), default adults & children
- **Day placeholders** — set recurring themes for each day of the week
- **Members** — view household members and their roles (owner/member/guest)
- **Invites** — generate invite links for new members or guests
- **Public sharing** — toggle a read-only public link for visiting family

<p align="center">
  <img src="docs/screenshots/07-settings-mobile.png" alt="Settings (mobile)" width="280" />
</p>

<details>
<summary>Desktop view</summary>
<p align="center">
  <img src="docs/screenshots/10-settings-desktop.png" alt="Settings (desktop)" width="700" />
</p>
</details>

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [Docker](https://www.docker.com/) (for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/planny-planny.git
   cd planny-planny
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start Supabase locally:**
   ```bash
   npx supabase start
   ```
   This starts a local Supabase instance with Postgres, Auth, Realtime, and more.

4. **Copy environment variables:**
   ```bash
   cp .env.example .env
   ```
   The default values in `.env.example` work with the local Supabase instance.

5. **Apply database migrations:**
   ```bash
   npx supabase db reset
   ```

6. **Start the dev server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

### Running Tests

```bash
# Run unit tests (Vitest)
npm test

# Run unit tests in watch mode
npm run test:watch

# Run BDD end-to-end tests (Playwright + playwright-bdd)
npm run test:e2e

# Run e2e tests with Playwright UI
npm run test:e2e:ui
```

## 🌍 Deployment

### Deploy to Production

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Link your local project:**
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

3. **Push database migrations:**
   ```bash
   npx supabase db push
   ```

4. **Set environment variables** for your hosting provider:
   ```
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

5. **Build and deploy:**
   ```bash
   npm run build
   ```
   Deploy the `dist/` folder to any static host: Vercel, Netlify, Cloudflare Pages, etc.

## 🏛️ Architecture

### Realtime-First

After authentication, all data flows through Supabase Realtime (WebSockets). When any household member makes a change — to the calendar, ingredients, or settings — it's pushed instantly to all connected members.

- **Writes**: REST API → Postgres (with Row-Level Security)
- **Reads**: Initial REST load, then WebSocket push for all changes
- **Auth**: The only REST-only flow (tokens must exist before WebSocket connects)

### Database

9 tables with Row-Level Security:
- `profiles` — User display info
- `households` — Household settings and defaults
- `household_members` — User ↔ household membership with roles
- `household_invites` — Token-based invite links
- `meal_plans` — Daily meal entries
- `meal_plan_ingredients` — Ingredients tagged to meals
- `ingredients` — Household ingredient library
- `day_placeholders` — Weekly recurring labels
- `day_contexts` — Per-day events and visitor overrides

### Roles

| Role | Can View | Can Edit | Can Invite |
|---|---|---|---|
| Owner | ✅ | ✅ | ✅ |
| Member | ✅ | ✅ | ✅ |
| Guest | ✅ | ❌ | ❌ |

## 📁 Project Structure

```
src/
├── App.tsx                              # Router and provider setup
├── main.tsx                             # Entry point
├── index.css                            # Tailwind imports
├── types/
│   └── database.ts                      # Supabase generated types
├── lib/
│   ├── supabase.ts                      # Supabase client
│   └── realtime.ts                      # Realtime subscription manager
├── hooks/
│   ├── useAuth.tsx                       # Auth context and provider
│   ├── useHousehold.tsx                  # Household context, switching, realtime
│   ├── useMealPlans.ts                   # Meal plan, day context, placeholder queries
│   ├── useIngredients.ts                 # Ingredient CRUD queries
│   └── useDayPlaceholders.ts             # Day placeholder queries
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── calendar/
│   │   ├── CalendarView.tsx              # Infinite-scroll perpetual calendar
│   │   ├── DayRow.tsx                    # Single day with meals and context
│   │   ├── MealCard.tsx                  # Meal display with ingredients
│   │   ├── MealPlanForm.tsx              # Add/edit meal form
│   │   ├── DayContextForm.tsx            # Add visitors/events to a day
│   │   └── DayContextBadge.tsx           # Visitor/event badge display
│   ├── ingredients/
│   │   ├── AddIngredientForm.tsx          # New ingredient input
│   │   ├── IngredientsList.tsx            # Sortable, searchable ingredient list
│   │   ├── IngredientSuggestions.tsx       # Autocomplete suggestions
│   │   └── IngredientTag.tsx              # Ingredient chip with warning badge
│   ├── layout/
│   │   ├── AppShell.tsx                   # Main app layout wrapper
│   │   ├── ProtectedRoute.tsx             # Auth guard
│   │   └── TabBar.tsx                     # Bottom tab navigation
│   └── settings/
│       ├── HouseholdSwitcher.tsx           # Household dropdown
│       ├── CreateHouseholdForm.tsx         # New household form
│       ├── HouseholdSettings.tsx           # Edit household details
│       ├── DayPlaceholders.tsx             # Weekly day themes
│       ├── MemberList.tsx                  # Household member list
│       ├── InviteManager.tsx               # Create/manage invite links
│       ├── PublicShareToggle.tsx           # Public sharing toggle
│       └── RoleBadge.tsx                  # Owner/member/guest badge
└── pages/
    ├── CalendarPage.tsx                   # Main calendar view
    ├── IngredientsPage.tsx                # Ingredient management
    ├── SettingsPage.tsx                   # Household and account settings
    ├── LoginPage.tsx                      # Login screen
    ├── RegisterPage.tsx                   # Registration screen
    ├── JoinInvitePage.tsx                 # Accept household invite
    └── PublicHouseholdPage.tsx            # Public read-only meal plan
```

## 📄 License

MIT
