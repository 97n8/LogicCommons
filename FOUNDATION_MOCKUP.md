# LogicCommons / PublicLogic Foundation Mockup

## 1) What is live right now

- `publiclogic.org` serves a marketing landing page generated at build time.
- `publiclogic.org/os/#/...` serves the LogicCommons OS app (component library build copied into `dist/os`).
- Router mode is `HashRouter`, so deep links are hash-based (`/os/#/dashboard`).
- Auth is Azure MSAL + allowed-email gate for ops routes.

## 2) UX mockup (current structure)

### Marketing (`/`)

```text
+--------------------------------------------------------------+
| PublicLogic                                                  |
| Civic operations infrastructure...                           |
| [ Open LogicCommons OS ]                                    |
+--------------------------------------------------------------+
```

### LogicCommons OS (`/os/#/...`)

```text
+------------------+-------------------------------------------+
| Sidebar          | Topbar                                    |
| - Dashboard      | [Capture] [Command] [User/Session]        |
| - Today          +-------------------------------------------+
| - Lists          | Main Content Area                         |
| - Pipeline       | - Dashboard / Lists / Projects / etc.     |
| - Projects       | - Phillipston governed environment routes |
| - Playbooks      |                                           |
| - Tools          |                                           |
| - Environments   |                                           |
| - Settings       |                                           |
+------------------+-------------------------------------------+
```

## 3) Runtime architecture mockup

```text
Browser
  -> publiclogic.org (Vercel project: publiclogic)
      -> buildCommand: node scripts/vercel-build.mjs
         -> creates dist/index.html (marketing)
         -> builds "PublicLogic OS Component Library (4)"
         -> copies bundle to dist/os

Auth boundary
  /os/#/*
   -> MSAL init (clientId + tenant + redirectUri)
   -> RequireAuth
   -> RequireAllowedUser (ops routes)
```

## 4) Verified foundation decisions

- Tokenized, theme-ready base styles are in the OS component app (`src/styles/theme.css`).
- Redirect URI normalization removes trailing slash drift for MSAL defaults.
- Canonical host hardening is applied in generated marketing and OS entry HTML (`www` -> apex).
- Deployment model is deterministic: one build script publishes both marketing + OS.

## 5) Foundation risks to watch (next)

- Vercel Deployment Protection on the `dist` project can conflict with cross-domain proxying.
- `HashRouter` avoids rewrite complexity but keeps hash URLs (acceptable now, can migrate later).
- Build script runs `npm ci` in component project each build (stable, but slower).

## 6) Build-ready checklist

- [x] Marketing and OS are clearly separated by path.
- [x] Auth route entrypoint is deterministic (`/os/#/...`).
- [x] Redirect URI defaults are normalized.
- [x] Theme/token layer is centralized.
- [x] Canonical host behavior (`www` to apex) is defined.
- [ ] Add smoke tests for `/`, `/os/`, and `/os/#/dashboard` post-deploy.
- [ ] Add deployment runbook with Azure redirect URI list.

## 7) Next safe build phase

1. Add deployment smoke-check script (curl + status/content assertions).
2. Add one auth config validation test for redirect URI format.
3. Add environment matrix doc (`dev`, `preview`, `prod`) with exact MSAL redirect URIs.
4. Freeze baseline via release tag once smoke checks are green.
