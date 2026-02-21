# Contributing to LogicCommons

## Development

All app work happens in the `APP/` directory.

```bash
cd APP
npm ci
npm run dev      # start dev server
npm run build    # production build
npm test         # run tests
npm run lint     # check code style
```

## Pull requests

1. Branch from `main`.
2. Work exclusively inside `APP/` for app changes.
3. Ensure **build**, **lint**, and **tests** pass before opening a PR:
   ```bash
   cd APP && npm run build && npm run lint && npm test
   ```
4. CI (`App Build & Test` workflow) must be green before merging.

## Project structure

```
APP/              ← canonical app (Vite + React + TypeScript)
  src/            ← app source code
  public/         ← static assets
  vitest.config.ts
  package.json
```

The `PublicLogic OS Component Library (4)/` directory contains the component library and is managed separately. See `APP/CLEANUP_PLAN.md` for migration history.

## Tests

We use [Vitest](https://vitest.dev/) with `@testing-library/react`. Place tests next to the code they cover using the `*.test.tsx` / `*.test.ts` naming convention.

## Code style

ESLint is configured in `APP/eslint.config.js`. The CI pipeline enforces linting on every PR.
