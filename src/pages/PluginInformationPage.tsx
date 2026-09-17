import { Link } from 'react-router-dom'

type PageKind = 'privacy' | 'terms' | 'support'

const CONTENT: Record<PageKind, {
  title: string
  introduction: string
  sections: { heading: string; body: string }[]
}> = {
  privacy: {
    title: 'Plugin privacy',
    introduction: 'How Planny Planny handles information when you connect it to ChatGPT.',
    sections: [
      {
        heading: 'Data used',
        body: 'The plugin processes your Planny Planny account identity and the household meal plans, ideas, events, outcomes, ingredients and todos needed to answer your request.',
      },
      {
        heading: 'Purpose and sharing',
        body: 'Data is used only to complete the actions you request. Requests pass between ChatGPT, the Planny Planny MCP server and Supabase, which stores the application data and enforces household access.',
      },
      {
        heading: 'Retention and control',
        body: 'The plugin does not create a separate conversation-history store. Your existing Planny Planny records remain until you edit or delete them. You can revoke the ChatGPT authorization grant or delete your account and households in Planny Planny.',
      },
      {
        heading: 'Sensitive information',
        body: 'Do not put passwords, payment-card details, government identifiers or medical information into meal-plan fields or plugin requests.',
      },
    ],
  },
  terms: {
    title: 'Plugin terms',
    introduction: 'Planny Planny is a personal, non-commercial family meal-planning project.',
    sections: [
      {
        heading: 'Use of the plugin',
        body: 'Use the plugin only with accounts and households you are authorized to access. Review proposed changes before confirming destructive actions such as deleting meals, todos, ideas, events or outcomes.',
      },
      {
        heading: 'Availability',
        body: 'The service is provided without a guaranteed uptime or service level. Features may change as the project evolves, and access may be suspended to protect users or data.',
      },
      {
        heading: 'Responsibility',
        body: 'Meal suggestions and generated responses are informational. Check ingredients, allergies, dietary needs and food-safety requirements yourself.',
      },
    ],
  },
  support: {
    title: 'Plugin support',
    introduction: 'Get help with connecting or using Planny Planny in ChatGPT.',
    sections: [
      {
        heading: 'Report a problem',
        body: 'Open a GitHub issue in the Planny Planny repository. Do not include passwords, OAuth tokens, private household notes or other sensitive information.',
      },
      {
        heading: 'Useful details',
        body: 'Include the action you attempted, the approximate time, the visible error message and whether the same action works in the Planny Planny web app.',
      },
      {
        heading: 'Disconnect',
        body: 'Revoke the Planny Planny authorization from your connected-app settings. Revocation prevents future plugin requests until you connect again.',
      },
    ],
  },
}

export default function PluginInformationPage({ kind }: { kind: PageKind }) {
  const content = CONTENT[kind]

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900">
      <article className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <Link to="/login" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
          ← Planny Planny
        </Link>
        <h1 className="mt-5 text-2xl font-bold">{content.title}</h1>
        <p className="mt-2 text-sm text-gray-600">{content.introduction}</p>
        <p className="mt-2 text-xs text-gray-500">Last updated: 17 September 2026</p>

        <div className="mt-6 space-y-6">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-base font-semibold">{section.heading}</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">{section.body}</p>
            </section>
          ))}
        </div>

        {kind === 'support' && (
          <a
            href="https://github.com/colinccook/planny-planny/issues/new"
            className="mt-6 inline-flex rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Open a GitHub issue
          </a>
        )}
      </article>
    </main>
  )
}
