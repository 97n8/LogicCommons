# APP Migration & Cleanup Plan

This plan assumes `APP/` is the new canonical application directory and existing root/subproject files are legacy unless explicitly migrated.

## Phase 1 — Inventory (completed)

### Keep now (do not delete yet)
- `.git/`, `.github/`, `.gitignore`
- `package.json`, `package-lock.json` (temporary until `APP/package.json` is active)
- `README.md` (temporary until rewritten)
- `vercel.json` and `.github/workflows/pages.yml` (temporary; both currently point to legacy paths)

### Likely source to migrate from
- `PublicLogic OS Component Library (4)/src/`
- `PublicLogic OS Component Library (4)/public/`
- `PublicLogic OS Component Library (4)/supabase/`
- `PublicLogic OS Component Library (4)/utils/`
- Selected config files from `PublicLogic OS Component Library (4)/` (`vite.config.ts`, `tsconfig.json`, lint/test config)

### Legacy/candidate delete later (after migration)
- Root Vite sample app files: `src/`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`
- Root static files: `public/`, `publiclogic-duck-mark.svg.png`, `FOUNDATION_MOCKUP.md`
- Legacy subproject container folder: `PublicLogic OS Component Library (4)/` (delete only after all required files are in `APP/`)
- Build artifacts: `dist/`, nested `node_modules/`

## Phase 2 — Scaffold APP
1. Create `APP/package.json` with minimal scripts (`dev`, `build`, `lint`, `test`, `preview`).
2. Add `APP/index.html`, `APP/vite.config.ts`, and TypeScript config files.
3. Create `APP/src/main.tsx` and `APP/src/App.tsx` as migration entrypoint.
4. Install dependencies in `APP/`.

## Phase 3 — Migrate required code
1. Copy required app code from `PublicLogic OS Component Library (4)/src` into `APP/src`.
2. Copy required static assets from legacy `public` into `APP/public`.
3. Move backend/support directories (`supabase`, `utils`) only if still used by app/runtime.
4. Fix import paths and aliases.

## Phase 4 — Switch CI/CD and docs
1. Update `.github/workflows/pages.yml` working directory and artifact path to `APP/`.
2. Update `vercel.json` install/build/output paths to `APP/`.
3. Rewrite root `README.md` to describe `APP/` as the only app.

## Phase 5 — Controlled deletion
Delete in this order, validating after each batch:
1. Root sample app files.
2. Unused root static/docs artifacts.
3. Legacy folder `PublicLogic OS Component Library (4)/`.
4. Extra lockfiles/build artifacts not used by final app.

## Migration helper note
- `scripts/merge-legacy-deps.js` — helper that merges missing deps/devDeps/scripts from `APP/legacy-root-package.json` to `APP/package.json`; run from repo root on branch `cleanup/migrate-root-app`.

## Validation gates (required before each delete batch)
- `npm --prefix APP ci`
- `npm --prefix APP run build`
- `npm --prefix APP run test` (if tests are configured)
- `npm --prefix APP run lint` (if lint is configured)

Only continue deletion when all active gates pass.

## Removal: legacy-root-src
- Date: 2026-02-21 09:52:59Z UTC
- Action: Removed APP/legacy-root-src after successful migration of contents into APP/src.
- Branch: cleanup/remove-legacy-root-src
- Commit: chore(cleanup): remove empty APP/legacy-root-src after migration
- Notes: Backups (.scaffold.bak) were removed earlier in cleanup/remove-scaffold-backups.

## Removal: legacy-root-config
- Date: 2026-02-21 09:56:17Z UTC
- Action: Removed or archived legacy root config/public artifacts (legacy-root-public, index.html, Vite/TS/ESLint configs).
- Branch: cleanup/remove-legacy-root-config
- Commit: chore(cleanup): remove or archive legacy-root config/public items after migration
- Notes: Any tracked files were archived under migration-backups/legacy-root-config via git mv (history preserved). Validate APP build before merging.

## Finalization
- Date: 2026-02-21
- Action: Final integration branch created and all migration branches merged. Workflows (`app-build.yml`) and `vercel.json` updated to use `APP` as canonical build root. `README.md` rewritten.
- Branch: cleanup/finalize
- Notes: After merging this PR into `main`, delete all `cleanup/*` branches and optionally tag `v1.0.0`.

## Component Library Strategy

**Decision**: Keep in-repo for now under `PublicLogic OS Component Library (4)/`.

**Rationale**: The component library is self-contained with its own `package.json`, build, and test scripts. It doesn't block APP development and can be consumed as a local dependency when needed.

**Future options** (choose when the library stabilizes):
1. **npm workspaces** — Add a root `package.json` with `"workspaces": ["APP", "PublicLogic OS Component Library (4)"]` so APP can import components directly.
2. **Extract to own repo/package** — Publish as `@publiclogic/components` on npm. Best if other projects need it.

**Remaining cleanup**:
- `.github/workflows/pages.yml` still builds the component library for GitHub Pages. Keep or remove based on whether the library site is still needed.
- `scripts/vercel-build.mjs` may be orphaned — verify and delete if unused.
- Root `package.json` and `package-lock.json` are legacy — delete once workspaces are configured or the component library is extracted.

## Production Hardening (v1.0.0-app-migration follow-up)

- [x] Vitest + @testing-library/react added with smoke tests
- [x] CI workflow updated: lint, type-check, build, test, audit
- [x] `vercel` CLI removed from devDeps (eliminated 27 of 37 audit vulnerabilities)
- [x] `concurrently` and legacy scripts cleaned from package.json
- [x] CONTRIBUTING.md added
- [ ] Remaining audit: 10 high (minimatch via eslint) — upstream fix requires ESLint 10. Dev-only, no production impact.
- [ ] Branch protection: require `App Build & Test` status check + PR review before merging to main
- [ ] Consider Prettier / format-on-save for consistent code style
