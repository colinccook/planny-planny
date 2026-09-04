# Tailwind CSS

Styling is [Tailwind CSS v4](https://tailwindcss.com/), a utility-first
framework: instead of writing CSS rules, you compose small single-purpose
classes directly on the element.

```tsx
<button className="rounded-lg bg-indigo-600 px-4 py-2 text-white">
  Save
</button>
```

## Conventions

- **Mobile-first, always.** Classes apply to the smallest screen by
  default; `sm:`, `md:`, `lg:` prefixes add overrides for larger
  breakpoints. Design the 390 px-wide phone layout first, then add
  breakpoints if a larger screen genuinely benefits.
- **Utility classes, not custom CSS.** Avoid hand-written stylesheets; the
  only global CSS is `src/index.css`, which imports Tailwind.
- **Tailwind v4** is wired in through the Vite plugin
  (`@tailwindcss/vite`), so there is no separate config file to maintain —
  the design tokens come from CSS in `src/index.css`.
- **Loading states** reuse the shared skeleton building blocks in
  `src/components/ui/Skeleton.tsx` — see
  [`docs/skeleton-strategy.md`](../skeleton-strategy.md) for the full
  pattern.

Next: [Supabase](supabase.md)
