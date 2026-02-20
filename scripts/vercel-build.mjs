import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_MARKETING_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PublicLogic</title>
    <script>
      if (window.location.hostname === "www.publiclogic.org") {
        const nextUrl = "https://publiclogic.org" + window.location.pathname + window.location.search + window.location.hash;
        window.location.replace(nextUrl);
      }
    </script>
    <style>
      :root {
        --bg: #f8fafc;
        --surface: #ffffff;
        --text: #0f172a;
        --muted: #64748b;
        --border: #e2e8f0;
        --primary: #2563eb;
      }
      html, body {
        height: 100%;
        margin: 0;
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background: var(--bg);
        color: var(--text);
      }
      .wrap {
        min-height: 100%;
        display: grid;
        place-items: center;
        padding: 24px;
      }
      .card {
        max-width: 680px;
        width: 100%;
        border: 1px solid var(--border);
        background: var(--surface);
        border-radius: 16px;
        padding: 28px;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
      }
      .kicker {
        font-size: 11px;
        letter-spacing: 0.24em;
        text-transform: uppercase;
        font-weight: 800;
        color: var(--muted);
      }
      h1 {
        margin: 10px 0 0;
        font-size: 32px;
        line-height: 1.15;
      }
      p {
        margin: 14px 0 0;
        font-size: 16px;
        line-height: 1.6;
        color: var(--muted);
        font-weight: 600;
      }
      .cta {
        margin-top: 22px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        text-decoration: none;
        background: var(--primary);
        color: #fff;
        font-weight: 700;
        border-radius: 10px;
        padding: 10px 14px;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <div class="kicker">PublicLogic</div>
        <h1>Civic operations infrastructure for accountable public work.</h1>
        <p>
          Welcome to PublicLogic. The public site remains at this root domain,
          while LogicCommons OS is available at the dedicated application path.
        </p>
        <a class="cta" href="/os/#/dashboard">Open LogicCommons OS</a>
      </div>
    </div>
  </body>
</html>
`;

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

function writeMarketingIndex(outDir) {
  const templatePath = path.join(repoRoot, "public", "marketing-index.html");
  const html = fs.existsSync(templatePath)
    ? fs.readFileSync(templatePath, "utf8")
    : DEFAULT_MARKETING_HTML;

  fs.writeFileSync(path.join(outDir, "index.html"), html);
}

function enforceApexHost(filePath) {
  if (!fs.existsSync(filePath)) return;
  const source = fs.readFileSync(filePath, "utf8");
  const guard = "window.location.hostname === \"www.publiclogic.org\"";
  if (source.includes(guard)) return;

  const script = `<script>if (window.location.hostname === "www.publiclogic.org") { const nextUrl = \`https://publiclogic.org\${window.location.pathname}\${window.location.search}\${window.location.hash}\`; window.location.replace(nextUrl); }</script>`;

  if (source.includes("</head>")) {
    fs.writeFileSync(filePath, source.replace("</head>", `${script}</head>`));
    return;
  }

  fs.writeFileSync(filePath, `${script}${source}`);
}

const repoRoot = path.resolve(process.cwd());
const outDir = path.join(repoRoot, "dist");
const osOutDir = path.join(outDir, "os");

const componentsRoot = path.join(repoRoot, "PublicLogic OS Component Library (4)");
const componentsDist = path.join(componentsRoot, "dist");
const componentsPublic = path.join(componentsRoot, "public");
const isOsProject =
  process.env.OS_ONLY === "1" ||
  process.env.VERCEL_PROJECT_ID === "prj_me8xbNOVTdb5TZ93GBcNYLHSVIbS";
// Clean output and write marketing shell
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
if (!isOsProject) {
  writeMarketingIndex(outDir);
}

// Build OS bundle with /os base path
run("npm", ["--prefix", componentsRoot, "ci"]);
run("npm", ["--prefix", componentsRoot, "run", "build"], {
  env: {
    ...process.env,
    VITE_BASE: isOsProject ? "/" : "/os/",
    VITE_DEMO_MODE: process.env.VITE_DEMO_MODE ?? "false",
  },
});

if (!fs.existsSync(componentsDist)) {
  throw new Error(`Build output missing: ${componentsDist}`);
}

if (isOsProject) {
  copyDir(componentsDist, outDir);
} else {
  copyDir(componentsDist, osOutDir);
  enforceApexHost(path.join(outDir, "index.html"));
  enforceApexHost(path.join(osOutDir, "index.html"));
}

function copyRootAsset(filename) {
  const src = path.join(componentsPublic, filename);
  const dest = path.join(outDir, filename);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

copyRootAsset("manifest.webmanifest");
copyRootAsset("config.js");
copyRootAsset("favicon-32.png");

if (isOsProject) {
  console.log(`Published OS bundle to root → ${outDir}`);
} else {
  console.log(`Published root marketing → ${outDir}`);
  console.log(`Published OS bundle → ${osOutDir}`);
}

