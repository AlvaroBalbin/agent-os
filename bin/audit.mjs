#!/usr/bin/env node
// Show the recent approval-gate activity (what asked, what was approved). Usage: node bin/audit.mjs [N]
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = process.env.AGENT_OS_HOME || dirname(dirname(fileURLToPath(import.meta.url)));
const STATE = join(ROOT, 'state');
const N = parseInt(process.argv[2] || '20', 10);
const read = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean) : []);

const pending = read(join(STATE, 'pending.jsonl')).slice(-N).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const approved = new Set(read(join(STATE, 'approved.txt')));
const consumed = new Set(read(join(STATE, 'consumed.txt')));

console.log(`agent-os audit (last ${pending.length} gated requests)\n`);
for (const p of pending) {
  const status = consumed.has(p.sig) ? 'USED' : approved.has(p.sig) ? 'APPROVED (unused)' : 'PENDING';
  console.log(`${p.at}  [${(p.category || '?').padEnd(14)}] ${p.sig}  ${status}`);
  console.log(`    ${p.summary}`);
}
if (!pending.length) console.log('(nothing gated yet)');
