# Copilot Instructions — LogicCommons

## Project overview

LogicCommons is a GitHub-connected operations dashboard built with React + TypeScript. It lets you manage repos, issues, PRs, CI, branches, labels, files, cases, vault variables, and environments — all from one UI.

**Important:** The app lives in `APP/`, not the repo root. Always `cd APP` before running commands.

## Quick start

```bash
cd APP
npm ci          # install deps from lockfile
npm run dev     # Vite dev server → http://localhost:5173
```

## Commands

Run everything from `APP/`:

| What | Command |
|------|---------|
| Dev server | `cd APP && npm run dev` |
| Production build | `cd APP && npm run build` |
| Lint | `cd APP && npm run lint` |
| Tests | `cd APP && npm test` |
| Watch tests | `cd APP && npm run test:watch` |
| Preview prod | `cd APP && npm run preview` |
| **Full CI check** | `cd APP && npm ci && npm run lint && npx tsc -b --noEmit && npm run build && npm test` |

## Search scope

When searching for files, **always search within the repo directory**, not from `~`. The important source files are:

- `APP/src/App.tsx` — the entire UI (single-file, 11 pages inline)
- `APP/src/App.css` — all styles
- `APP/src/github.ts` — GitHub API client
- `APP/src/App.test.tsx` — 42 Vitest tests
- `APP/src/main.tsx` — React entry point
- `APP/src/index.css` — base/reset styles

Config and deploy files at the repo root:

- `vercel.json` — Vercel deploy (points to `APP/`)
- `scripts/vercel-build.mjs` — Vercel build script
- `.github/workflows/app-build.yml` — CI: lint, type-check, build, test
- `.github/workflows/pages.yml` — GitHub Pages deploy

## Architecture

### App structure (`APP/src/App.tsx`)

Single-file React app with these inline page components, switched by a `page` state variable:

- **Dashboard** — metric cards (issues, PRs, stars, forks) from live GitHub data
- **Issues** — list/filter open/closed/all issues
- **PRs** — list/filter pull requests
- **CI** — workflow runs
- **Branches** — branch list
- **Labels** — repo labels
- **Files** — browse/edit repo files (Contents API)
- **Cases** — case management
- **Vault** — repository variables (Variables API)
- **Environments** — environment provisioning
- **Settings** — token setup, account info, repo switching

Key internal components: `RepoPicker`, `TokenSetup`, `CreateModal`, `CommandPalette`, `StatusDot`, `Badge`, `EmptyState`, `MetricCard`

Hooks: `useToasts()` for notifications, `useLiveData(ctx)` for GitHub data fetching

### GitHub API client (`APP/src/github.ts`)

All API calls go through `api<T>(url, init?)`. Key patterns:

- **Auth:** Bearer token from `localStorage` via `getToken()`
- **Guard writes:** always check `gh.hasToken()` before mutations
- **Repo context:** `RepoCtx = { owner, repo }` passed to every API call
- **Error handling:** throws `GitHub ${status}: ${body.slice(0,200)}`
- **File encoding:** `decodeContent(base64)` / `encodeContent(text)` for Contents API

Available functions: `fetchUser`, `fetchUserRepos`, `createRepo`, `fetchRepo`, `fetchIssues`, `fetchPRs`, `fetchWorkflowRuns`, `fetchBranches`, `fetchLabels`, `fetchDirContents`, `fetchFileContent`, `putFile`, `deleteFile`

## Conventions

- **All app work in `APP/`** — only touch root files for CI/deploy config
- **Tests next to source** — `*.test.tsx` / `*.test.ts` naming
- **ESLint 9+ flat config** — `defineConfig` + `globalIgnores` from `eslint/config`
- **`eslint-plugin-react-refresh` 0.5+** — named export: `import { reactRefresh } from 'eslint-plugin-react-refresh'`
- **Toast errors** — `catch (e) { toast(\`Failed: ${e instanceof Error ? e.message : 'unknown'}\`, 'error') }`
- **Token guard** — `if (!gh.hasToken()) { toast('Set a GitHub token in Settings to perform actions', 'error'); return }`
- **TypeScript strict** — component library uses `noUncheckedIndexedAccess: true`

## Tech stack

- React 19, TypeScript 5.9, Vite 7, Vitest 4
- `@testing-library/react` + `jsdom` for tests
- ESLint 9 with flat config
- Node 20 (CI), Vercel (deploy), GitHub Actions (CI)
