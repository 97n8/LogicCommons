// Helper: merge missing deps/devDeps/scripts from APP/legacy-root-package.json into APP/package.json without overwriting existing APP entries.
/**
 * Usage: node scripts/merge-legacy-deps.js <legacyPath> <appPath>
 *
 * Behavior:
 * - Adds missing dependencies/devDependencies and missing scripts from legacy to app.
 * - Leaves existing app versions/scripts unchanged.
 * - Prints merged summary and conflicts.
 */
const fs = require('fs');

function readJson(p) {
  if (!fs.existsSync(p)) {
    console.error('Missing file:', p);
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

const [legacyPath, appPath] = process.argv.slice(2);
if (!legacyPath || !appPath) {
  console.error('Usage: node scripts/merge-legacy-deps.js <legacyPath> <appPath>');
  process.exit(2);
}

const legacy = readJson(legacyPath);
const app = readJson(appPath);

const report = { added: { deps: [], devDeps: [], scripts: [] }, conflicts: [] };

app.dependencies = app.dependencies || {};
app.devDependencies = app.devDependencies || {};
app.scripts = app.scripts || {};

function mergeMap(source = {}, target = {}, kind) {
  for (const [k, v] of Object.entries(source)) {
    if (!target.hasOwnProperty(k)) {
      target[k] = v;
      report.added[kind].push({ name: k, version: v });
    } else if (target[k] !== v) {
      report.conflicts.push({ kind, name: k, app: target[k], legacy: v });
    }
  }
}

mergeMap(legacy.dependencies, app.dependencies, 'deps');
mergeMap(legacy.devDependencies, app.devDependencies, 'devDeps');

for (const [k, v] of Object.entries(legacy.scripts || {})) {
  if (!app.scripts.hasOwnProperty(k)) {
    app.scripts[k] = v;
    report.added.scripts.push({ name: k, cmd: v });
  } else if (app.scripts[k] !== v) {
    report.conflicts.push({ kind: 'script', name: k, app: app.scripts[k], legacy: v });
  }
}

writeJson(appPath, app);

console.log('--- merge summary ---');
console.log('Added dependencies:', report.added.deps.length ? report.added.deps : '(none)');
console.log('Added devDependencies:', report.added.devDeps.length ? report.added.devDeps : '(none)');
console.log('Added scripts:', report.added.scripts.length ? report.added.scripts : '(none)');
if (report.conflicts.length) {
  console.log('\nConflicts (did NOT overwrite):');
  report.conflicts.forEach(c => {
    console.log(` - [${c.kind}] ${c.name}: app="${c.app}"  legacy="${c.legacy}"`);
  });
} else {
  console.log('\nNo conflicts found.');
}
console.log('Wrote merged package.json to', appPath);
