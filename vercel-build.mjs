import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function run(command) {
  execSync(command, { stdio: "inherit" });
}

function ensureExists(path, description) {
  if (!existsSync(path)) {
    throw new Error(`Expected ${description} at ${path}, but it was not created.`);
  }
}

const rootDir = process.cwd();
const outputDir = resolve(rootDir, "dist");

console.log("[vercel-build] Building frontend workspace...");
run("pnpm --filter @workspace/byu-connect run build");

const indexPath = resolve(outputDir, "index.html");
ensureExists(indexPath, "frontend index.html");

const assetsDir = resolve(outputDir, "assets");
ensureExists(assetsDir, "frontend assets directory");

const assetFiles = readdirSync(assetsDir);
if (assetFiles.length === 0) {
  throw new Error(`No files were generated in ${assetsDir}.`);
}

const diagnosticsDir = resolve(outputDir, "_diagnostics");
mkdirSync(diagnosticsDir, { recursive: true });

const metadata = {
  generatedAt: new Date().toISOString(),
  commitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
  commitRef: process.env.VERCEL_GIT_COMMIT_REF || null,
  commitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE || null,
  deploymentUrl: process.env.VERCEL_URL || null,
};

const metadataPath = resolve(diagnosticsDir, "build-meta.json");
writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

console.log("[vercel-build] Build completed.");
console.log(`[vercel-build] Verified output: ${indexPath}`);
console.log(`[vercel-build] Wrote diagnostics: ${metadataPath}`);
