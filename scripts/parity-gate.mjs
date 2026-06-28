#!/usr/bin/env node
/* Parity gate — enforces docs/PARITY_STANDARD.md mechanically.
 *
 * Rule: in FEATURE_COMPLETION_MATRIX.md, any line tagged `parity:<id>` whose status says
 * "Done" MUST have docs/parity/<id>.md with ZERO unchecked boxes ("- [ ]"). Otherwise fail.
 * This makes it impossible to mark a player feature Done without finishing its parity checklist.
 * Exit non-zero on any violation so the pre-commit hook / CI block it.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const matrixPath = join(root, 'FEATURE_COMPLETION_MATRIX.md');
let errors = 0;
const fail = (m) => { console.error('✗ ' + m); errors++; };
const ok = (m) => console.log('✓ ' + m);

if (!existsSync(matrixPath)) {
  console.error('✗ FEATURE_COMPLETION_MATRIX.md missing'); process.exit(1);
}
const matrix = readFileSync(matrixPath, 'utf8');

let checked = 0;
for (const line of matrix.split('\n')) {
  const tag = line.match(/parity:([a-z0-9_-]+)/i);
  if (!tag) continue;
  const id = tag[1];
  const isDone = /\bDone\b/i.test(line);
  if (!isDone) { ok(`parity:${id} — not Done yet (gate not required)`); continue; }
  const file = join(root, 'docs', 'parity', `${id}.md`);
  if (!existsSync(file)) { fail(`parity:${id} is marked Done but docs/parity/${id}.md is missing`); continue; }
  const body = readFileSync(file, 'utf8');
  const unchecked = (body.match(/- \[ \]/g) || []).length;
  if (unchecked > 0) fail(`parity:${id} is marked Done but docs/parity/${id}.md has ${unchecked} unchecked box(es)`);
  else { ok(`parity:${id} — Done and checklist fully checked`); checked++; }
}

if (errors) {
  console.error(`\nPARITY GATE FAILED (${errors} issue${errors > 1 ? 's' : ''}). See docs/PARITY_STANDARD.md.`);
  process.exit(1);
}
console.log(`\nPARITY GATE PASSED (${checked} feature(s) fully verified).`);
