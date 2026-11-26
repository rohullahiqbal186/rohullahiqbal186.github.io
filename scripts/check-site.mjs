// Checks that every internal href/src in the site's HTML files points at a
// file that exists, and that every #fragment exists on its target page.
// Run from the repository root: node scripts/check-site.mjs
// External links (http/https/mailto) are listed but not fetched.

import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith(".") || e.name === "node_modules" || e.name === "scripts") return [];
    const p = join(dir, e.name);
    return e.isDirectory() ? htmlFiles(p) : e.name.endsWith(".html") ? [p] : [];
  });
}

function target(fromFile, url) {
  const clean = url.split("#")[0].split("?")[0];
  let p = clean.startsWith("/") ? join(root, clean) : resolve(dirname(fromFile), clean || ".");
  if (!clean) p = fromFile;
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
  return p;
}

const ids = new Map();
function idsOf(file) {
  if (!ids.has(file)) {
    const html = readFileSync(file, "utf8");
    ids.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return ids.get(file);
}

let errors = 0;
const external = new Set();
for (const file of htmlFiles(root)) {
  const html = readFileSync(file, "utf8").replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:)/.test(url)) { external.add(url); continue; }
    const t = target(file, url);
    const rel = relative(root, file);
    if (!existsSync(t)) { console.log(`MISSING  ${rel}: ${url}`); errors++; continue; }
    const frag = url.includes("#") ? url.split("#")[1] : "";
    if (frag && t.endsWith(".html") && !idsOf(t).has(frag)) {
      console.log(`NO ANCHOR ${rel}: ${url}`); errors++;
    }
  }
}
console.log(`\nExternal links (not fetched):\n  ${[...external].sort().join("\n  ")}`);
console.log(errors ? `\n${errors} problem(s) found.` : "\nAll internal links and assets resolve.");
process.exit(errors ? 1 : 0);
