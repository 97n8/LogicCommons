# LogicCommons — canonical app: APP/

This repository has been reorganized so the canonical, deployable application lives in APP/.

## Quick start

```bash
cd APP
npm ci
npm run dev
```

## Build / test

```bash
cd APP
npm ci
npm run build
npm test
```

## Deploy

- **Vercel**: vercel.json is configured to install, build, and serve from APP/.
- **GitHub Pages**: .github/workflows/app-build.yml builds APP/ on every push to main and on PRs that touch APP/**.

## Migration notes

See APP/CLEANUP_PLAN.md for the full migration history, decisions, and remaining items.
