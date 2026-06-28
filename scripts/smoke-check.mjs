#!/usr/bin/env node
/* Eldermoor smoke check — keeps `main` always-playable.
 * Pass criteria:
 *   1. Every JS file under src/ parses (node --check).
 *   2. index.html exists and references src/main.js as a module (after Phase 2).
 * Pre-Phase-2 (single-file index.html, no src/) it passes trivially.
 * Exit non-zero on any failure so the pre-commit hook / CI can block.
 */
import { readdirSync, statSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
let errors = 0;
const fail = (m) => { console.error("✗ " + m); errors++; };
const ok   = (m) => console.log("✓ " + m);

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (e.endsWith(".js") || e.endsWith(".mjs")) out.push(p);
  }
  return out;
}

// 1) syntax-check JS modules
const srcDir = join(root, "src");
const files = walk(srcDir);
if (files.length === 0) {
  ok("no src/ modules yet (pre-modularization) — skipping module syntax check");
} else {
  for (const f of files) {
    try { execFileSync(process.execPath, ["--check", f], { stdio: "pipe" }); ok("parsed " + f.replace(root + "/", "")); }
    catch (e) { fail("syntax error in " + f.replace(root + "/", "") + "\n" + (e.stderr?.toString() || e.message)); }
  }
}

// 2) index.html wiring
const idx = join(root, "index.html");
if (!existsSync(idx)) fail("index.html is missing");
else {
  const html = readFileSync(idx, "utf8");
  ok("index.html present");
  if (files.length > 0 && !/src\/main\.js/.test(html))
    fail("index.html does not reference src/main.js (expected after modularization)");
}

if (errors) { console.error(`\nSMOKE CHECK FAILED (${errors} issue${errors > 1 ? "s" : ""}).`); process.exit(1); }
console.log("\nSMOKE CHECK PASSED.");
