#!/usr/bin/env node
// Approve one or more gated action ids (single-use). Usage: node bin/approve.mjs <id> [<id> ...]
import { appendFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = process.env.AGENT_OS_HOME || dirname(dirname(fileURLToPath(import.meta.url)));
const STATE = process.env.AGENT_OS_STATE || join(ROOT, 'state');
mkdirSync(STATE, { recursive: true });

const ids = process.argv.slice(2).map((s) => s.trim()).filter(Boolean);
if (!ids.length) { console.error('usage: node bin/approve.mjs <action-id> [more ids]'); process.exit(1); }

const pendingFile = join(STATE, 'pending.jsonl');
const known = new Set();
if (existsSync(pendingFile)) {
  for (const l of readFileSync(pendingFile, 'utf8').split(/\r?\n/).filter(Boolean)) {
    try { known.add(JSON.parse(l).sig); } catch {}
  }
}
for (const id of ids) {
  if (!known.has(id)) console.error(`warning: ${id} has no pending request (typo? approving anyway)`);
  appendFileSync(join(STATE, 'approved.txt'), id + '\n');
}
console.log('approved (single-use): ' + ids.join(', '));
