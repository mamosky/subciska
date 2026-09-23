import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const bucket = process.env.R2_CACHE_BUCKET || "subciska-cache";
const prefix = process.env.NEXT_INC_CACHE_R2_PREFIX || "incremental-cache";
const cacheDir = path.resolve(".open-next/cache");

function walk(dir, root = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, root, out);
      continue;
    }
    const rel = path.relative(root, full).split(path.sep).join("/");
    if (rel.startsWith("__fetch/")) {
      const parts = rel.split("/");
      const buildId = parts[1];
      const keyParts = parts.slice(2);
      if (buildId && keyParts.length > 0) {
        out.push({ full, key: `/${keyParts.join("/")}`, buildId, cacheType: "fetch" });
      }
      continue;
    }
    if (!rel.endsWith(".cache")) continue;
    const [buildId, ...keyParts] = rel.slice(0, -".cache".length).split("/");
    if (!buildId || keyParts.length === 0) continue;
    out.push({ full, key: `/${keyParts.join("/")}`, buildId, cacheType: "cache" });
  }
  return out;
}

const assets = walk(cacheDir);
if (assets.length === 0) {
  console.log("No cache assets to populate");
  process.exit(0);
}

for (const asset of assets) {
  const hash = createHash("sha256").update(asset.key).digest("hex");
  const key = `${prefix}/${asset.buildId}/${hash}.${asset.cacheType}`.replace(/\/+/g, "/");
  console.log(`PUT ${key}`);
  execFileSync(
    "npx",
    ["wrangler", "r2", "object", "put", `${bucket}/${key}`, "--file", asset.full, "--remote"],
    { stdio: "inherit", env: { ...process.env, CI: "true" } }
  );
}

console.log("Cache populated");
