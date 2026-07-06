#!/usr/bin/env node
// Approve one or more gated action ids (single-use). Usage: node bin/approve.mjs <id> [<id> ...]
import { appendFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = process.env.AGENT_OS_HOME || dirname(dirname(fileURLToPath(import.meta.url)));
const STATE = join(ROOT, 'state');
mkdirSync(STATE, { recursive: true });

const ids = process.argv.slice(2).map((s) => s.trim()).filter(Boolean);
if (!ids.length) { console.error('usage: node bin/approve.mjs <action-id> [more ids]'); process.exit(1); }
for (const id of ids) appendFileSync(join(STATE, 'approved.txt'), id + '\n');
console.log('approved (single-use): ' + ids.join(', '));
