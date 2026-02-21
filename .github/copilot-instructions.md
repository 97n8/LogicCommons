# Copilot Instructions — LogicCommons

## Project overview
LogicCommons is a React + TypeScript app built with Vite. The canonical app lives in the **repo root** (`LogicCommons/`), not a subdirectory. There is no `APP/` directory.

## Quick start
```bash
# From the repo root (LogicCommons/)
npm ci            # install dependencies (from lockfile)
npm run dev       # start Vite dev server (http://localhost:5173)
```

## Common commands
All commands run from the **repo root**:

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run dev:components` | Start component library dev server |
| `npm run dev:all` | Start both concurrently |
| `npm run build` | Type-check (tsc) + production build (vite) |
| `npm run lint` | ESLint (flat config, ESLint 9+) |
| `npm run preview` | Preview production build (http://localhost:4173) |
| `npm run verify` | lint + build app + build components |
| `npm run install:all` | Install dependencies for app and component library |

## Project structure
```
LogicCommons/                         ← repo root, also the app
  src/
    App.tsx                           ← main app component
    App.css                           ← app styles
    index.css                         ← base/reset styles
    main.tsx                          ← React entry point
    assets/                           ← static assets
  PublicLogic OS Component Library (4)/  ← component library (managed separately)
  .github/
    workflows/
      pages.yml                       ← GitHub Pages deploy on push to main
  eslint.config.js                    ← ESLint 9+ flat config
  vite.config.ts
  tsconfig.json / tsconfig.app.json / tsconfig.node.json
  package.json
```

## Search scope
When searching for files or code, search within `~/LogicCommons/` — do not crawl `~/Library/` or other system directories.

## Tech stack
- React 19, TypeScript 5.9, Vite 7
- ESLint 9+ with flat config
- Deployed via GitHub Pages (Vercel config also present)

## Conventions
- **All app work happens in the repo root** — `src/`, `eslint.config.js`, `vite.config.ts`, etc.
- **Component library** lives in `PublicLogic OS Component Library (4)/` and has its own `package.json`. Use `npm run dev:components` / `npm run build:components` to work with it.
- **ESLint 9+ flat config** — uses `defineConfig` and `globalIgnores`.
- **TypeScript strict mode**.
