import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else if (entry.isSymbolicLink()) {
      const linkTarget = fs.readlinkSync(from);
      fs.symlinkSync(linkTarget, to);
    } else fs.copyFileSync(from, to);
  }
}

function writeRedirectIndex(outDir) {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="refresh" content="0; url=/hmlp/" />
    <title>PublicLogic</title>
    <style>
      html, body { height: 100%; margin: 0; font-family: ui-sans-serif, system-ui; background: #f7fbf8; color: #0f172a; }
      .wrap { height: 100%; display: grid; place-items: center; padding: 24px; }
      .card { max-width: 520px; width: 100%; border: 1px solid rgba(15, 23, 42, 0.10); background: white; border-radius: 24px; padding: 20px; box-shadow: 0 20px 60px rgba(15,23,42,0.08); }
      .kicker { font-size: 11px; letter-spacing: 0.28em; text-transform: uppercase; font-weight: 900; color: rgba(15,23,42,0.55); }
      h1 { margin: 10px 0 0; font-size: 22px; }
      p { margin: 10px 0 0; font-size: 14px; line-height: 1.5; color: rgba(15,23,42,0.70); font-weight: 600; }
      a { color: #0f766e; font-weight: 900; text-decoration: underline; text-underline-offset: 3px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <div class="kicker">Governed App</div>
        <h1>Redirecting to the portal…</h1>
        <p>If you are not redirected, open <a href="/hmlp/">/hmlp/</a>.</p>
      </div>
    </div>
  </body>
</html>
`;
  fs.writeFileSync(path.join(outDir, "index.html"), html);
}

const repoRoot = path.resolve(process.cwd());
const outDir = path.join(repoRoot, "dist");
const hmlpOutDir = path.join(outDir, "hmlp");

const componentsRoot = path.join(repoRoot, "PublicLogic OS Component Library (4)");
const componentsDist = path.join(componentsRoot, "dist");

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
writeRedirectIndex(outDir);

run("npm", ["--prefix", componentsRoot, "ci"]);
run("npm", ["--prefix", componentsRoot, "run", "build"], {
  env: {
    ...process.env,
    VITE_BASE: "/hmlp/",
    VITE_DEMO_MODE: process.env.VITE_DEMO_MODE ?? "false",
  },
});

if (!fs.existsSync(componentsDist)) {
  throw new Error(`Build output missing: ${componentsDist}`);
}

copyDir(componentsDist, hmlpOutDir);

console.log(`Published ${componentsDist} → ${hmlpOutDir}`);

