/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Base path the app is served from. Override with `BASE_PATH` for any
  // deploy target other than the default GitHub Pages project site, e.g.:
  //   - GitHub Pages project site (default): `/planny-planny/`
  //   - Custom apex domain (e.g. plannyplanny.app): set `BASE_PATH=/`
  //   - Custom subpath:                            set `BASE_PATH=/your/path/`
  base: process.env.BASE_PATH ?? (process.env.GITHUB_PAGES ? '/planny-planny/' : '/'),
  plugins: [
    react(),
    tailwindcss(),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['node_modules', '.features-gen', 'tests'],
  },
})
