#!/usr/bin/env node
/*
 * agent-os :: costed-action-guard
 * A Claude Code PreToolUse hook. Classifies each tool call against the policy in config/guard.rules.json
 * plus the enabled rulepacks, and GATES anything costed / outbound / destructive behind a phone approval.
 * Fails CLOSED. Reads, edits, builds, tests, and read-only SQL run free.
 *
 * Self-locating: AGENT_OS_HOME defaults to the repo/install root (two levels up from this file), so it works
 * both in-repo (for tests) and when installed to ~/.claude/agent-os. Runtime state lives under <root>/state.
 *
 * Approval flow (single-use, deterministic):
 *   gated call -> short action id (sha256 of tool+input, 8 chars)
 *   id in state/approved.txt and not in state/consumed.txt -> allow once, consume
 *   else -> deny, append to state/pending.jsonl, tell the agent to ask the founder ("approve <id>")
 */
import { readFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = process.env.AGENT_OS_HOME || dirname(dirname(fileURLToPath(import.meta.url)));
const STATE = join(ROOT, 'state');
try { mkdirSync(STATE, { recursive: true }); } catch {}

function emit(decision, reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: reason },
  }));
  process.exit(0);
}

// ---- read hook payload ----
let payload = {};
try { payload = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {}
const tool = payload.tool_name || '';
const input = payload.tool_input || {};

// ---- load + merge config ----
function readJson(p) { try { return JSON.parse(readFileSync(p, 'utf8').replace(/^﻿/, '')); } catch { return null; } }
const base = readJson(join(ROOT, 'config', 'guard.rules.json')) || { categories: {}, defaultPolicy: 'allow', enabledPacks: [] };
const cfg = { categories: base.categories || {}, defaultPolicy: base.defaultPolicy || 'allow',
              toolMatchers: {}, bashMatchers: [], allowlist: [], sqlMutation: 'db_write' };
for (const pack of (base.enabledPacks || [])) {
  const p = readJson(join(ROOT, 'rulepacks', pack + '.json'));
  if (!p) continue;
  Object.assign(cfg.toolMatchers, p.toolMatchers || {});
  cfg.bashMatchers.push(...(p.bashMatchers || []));
  cfg.allowlist.push(...(p.allowlist || []));
  if (p.sqlMutation) cfg.sqlMutation = p.sqlMutation;
}

// ---- classify ----
function isMutationSQL(q = '') {
  const s = String(q).replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim().toLowerCase();
  return /^(insert|update|delete|alter|drop|truncate|create|grant|revoke|merge)\b/.test(s);
}
const isShell = tool === 'Bash' || tool.endsWith('Bash') || tool.endsWith('PowerShell');
const cmd = isShell ? String(input.command || '') : '';

function classify() {
  if (cmd && cfg.allowlist.some((rx) => safeRe(rx).test(cmd))) return { category: null, why: 'allowlisted' };
  for (const [sub, cat] of Object.entries(cfg.toolMatchers)) if (sub && tool.includes(sub)) return { category: cat, why: `tool "${tool}" ~ ${sub}` };
  if (tool.includes('execute_sql') && isMutationSQL(input.query)) return { category: cfg.sqlMutation, why: 'SQL mutation' };
  if (cmd) for (const m of cfg.bashMatchers) if (safeRe(m.pattern).test(cmd)) return { category: m.category, why: `command ~ ${m.category}` };
  return { category: null, why: 'no match' };
}
function safeRe(p) { try { return new RegExp(p, 'i'); } catch { return { test: () => false }; } }

const { category, why } = classify();
const policy = category ? (cfg.categories[category]?.policy || cfg.defaultPolicy) : 'allow';

if (policy === 'allow') emit('allow', category ? `${category}: allowed by policy` : 'not a gated action');
if (policy === 'deny')  emit('deny', `BLOCKED: ${category} is policy=deny (${why}). No approval path; do not attempt.`);

// ---- gate: approval check ----
const sig = createHash('sha256').update(tool + '\n' + JSON.stringify(input)).digest('hex').slice(0, 8);
const lines = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean) : []);
const approved = lines(join(STATE, 'approved.txt'));
const consumed = lines(join(STATE, 'consumed.txt'));

if (approved.includes(sig) && !consumed.includes(sig)) {
  try { appendFileSync(join(STATE, 'consumed.txt'), sig + '\n'); } catch {}
  emit('allow', `approved action ${sig} (single-use, consumed)`);
}

try {
  appendFileSync(join(STATE, 'pending.jsonl'),
    JSON.stringify({ sig, category, tool, why, summary: (tool + ' ' + JSON.stringify(input)).slice(0, 300), at: new Date().toISOString() }) + '\n');
} catch {}

emit('deny',
  `APPROVAL REQUIRED [${category}] (${why}). Action id ${sig}. Do NOT retry blindly. ` +
  `Message the owner: "Approve ${sig}? ${tool} - <one line what/why>". ` +
  `Proceed ONLY after approval (run: node ${join(ROOT, 'bin', 'approve.mjs')} ${sig}); the guard then allows this exact call once.`);
