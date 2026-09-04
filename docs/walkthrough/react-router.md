# React Router

Routing is [React Router v7](https://reactrouter.com/). Bootstrap is split
between two files:

- `src/main.tsx` mounts `QueryClientProvider` (the TanStack Query cache)
  and `BrowserRouter` around `<App />`.
- `src/App.tsx` declares the routes and the in-app providers.

## The provider tree

From outermost to innermost:

```
QueryClientProvider             ← TanStack Query cache (main.tsx)
  BrowserRouter                 ← React Router (main.tsx)
    AuthProvider                ← who is logged in?
      ToastProvider             ← global toast notifications
        <Routes>
          /login, /register, /invite/:token, /shared/:token  (public)
          /*  ProtectedRoute
            HouseholdProvider   ← which household am I looking at?
              OverlayProvider   ← which tray/modal is open?
                AppShell + nested <Routes>
```

`HouseholdProvider` and `OverlayProvider` are intentionally inside
`ProtectedRoute` because they only make sense once the user is signed in.
Each provider owns its slice of state; components further down the tree
consume it via the matching `useFoo()` hook.

## Conventions

- One file per top-level route in `src/pages/`.
- Public routes (`/login`, `/register`, `/invite/:token`,
  `/shared/:token`) sit outside `ProtectedRoute`.
- The app is a single-page application hosted on GitHub Pages, so the
  deploy workflow copies `dist/index.html` to `dist/404.html` — GitHub
  Pages serves it for unknown paths and React Router takes over from
  there.

Next: [Testing with Vitest](testing.md)
