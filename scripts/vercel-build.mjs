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

const repoRoot = path.resolve(process.cwd());
const outDir = path.join(repoRoot, "dist");

const componentsRoot = path.join(repoRoot, "PublicLogic OS Component Library (4)");
const componentsDist = path.join(componentsRoot, "dist");
const componentsPublic = path.join(componentsRoot, "public");
// Clean output
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

// Build OS bundle at root (VITE_BASE=/)
run("npm", ["--prefix", componentsRoot, "ci"]);
run("npm", ["--prefix", componentsRoot, "run", "build"], {
  env: {
    ...process.env,
    VITE_BASE: "/",
    VITE_DEMO_MODE: process.env.VITE_DEMO_MODE ?? "false",
  },
});

if (!fs.existsSync(componentsDist)) {
  throw new Error(`Build output missing: ${componentsDist}`);
}

copyDir(componentsDist, outDir);

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

console.log(`Published OS bundle to root → ${outDir}`);

