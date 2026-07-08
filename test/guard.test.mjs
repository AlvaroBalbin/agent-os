// Test harness for the config-driven guard. Run: node test/guard.test.mjs
// Uses a throwaway state dir (AGENT_OS_STATE) so it never touches live approvals.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const GUARD = join(ROOT, 'hooks', 'costed-action-guard.mjs');
const APPROVE = join(ROOT, 'bin', 'approve.mjs');
const STATE = mkdtempSync(join(tmpdir(), 'agent-os-test-'));
const env = { ...process.env, AGENT_OS_STATE: STATE };

// "defer" = the guard stays silent and Claude Code's own permission flow decides.
const cases = [
  ['Read (safe)',              { tool_name: 'Read', tool_input: { file_path: '/x' } }, 'defer'],
  ['Bash ls (safe)',           { tool_name: 'Bash', tool_input: { command: 'ls -la' } }, 'defer'],
  ['git commit (safe)',        { tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }, 'defer'],
  ['git push feature (safe)',  { tool_name: 'Bash', tool_input: { command: 'git push origin HEAD:refs/heads/feat/x' } }, 'defer'],
  ['SQL SELECT (safe)',        { tool_name: 'mcp__x__execute_sql', tool_input: { query: 'select 1' } }, 'defer'],
  ['npm install (safe)',       { tool_name: 'Bash', tool_input: { command: 'npm install lodash' } }, 'defer'],
  ['SQL INSERT (gate)',        { tool_name: 'mcp__x__execute_sql', tool_input: { query: 'insert into t values (1)' } }, 'deny'],
  ['Resend send (gate)',       { tool_name: 'mcp__resend__send-email', tool_input: { to: 'a' } }, 'deny'],
  ['WhatsApp send (gate)',     { tool_name: 'mcp__whatsapp__send_message', tool_input: { text: 'hi' } }, 'deny'],
  ['railway up (gate)',        { tool_name: 'Bash', tool_input: { command: 'railway up' } }, 'deny'],
  ['git push main (gate)',     { tool_name: 'Bash', tool_input: { command: 'git push origin main' } }, 'deny'],
  ['git push --force (gate)',  { tool_name: 'Bash', tool_input: { command: 'git push origin feat --force' } }, 'deny'],
  ['rm -rf (gate)',            { tool_name: 'Bash', tool_input: { command: 'rm -rf ./build' } }, 'deny'],
  ['vercel deploy (gate)',     { tool_name: 'Bash', tool_input: { command: 'vercel deploy --prod' } }, 'deny'],
  ['npm publish (gate)',       { tool_name: 'Bash', tool_input: { command: 'npm publish' } }, 'deny'],
];

const run = (p) => { const r = spawnSync('node', [GUARD], { input: JSON.stringify(p), encoding: 'utf8', env });
  if (!r.stdout.trim()) return { permissionDecision: 'defer' };
  try { return JSON.parse(r.stdout).hookSpecificOutput; } catch { return { raw: r.stdout, err: r.stderr }; } };

let pass = 0, fail = 0, firstDeny = null, firstDenyPayload = null;
for (const [label, payload, expect] of cases) {
  const o = run(payload); const got = o.permissionDecision || '??'; const ok = got === expect;
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(24)} -> ${got}${ok ? '' : `  (want ${expect})  ${o.err || o.raw || ''}`}`);
  if (got === 'deny' && !firstDeny) { const m = /Action id (\w+)/.exec(o.permissionDecisionReason || ''); if (m) { firstDeny = m[1]; firstDenyPayload = payload; } }
}
console.log(`\n${pass} pass / ${fail} fail`);

if (firstDeny) {
  console.log(`\n-- approval round-trip on ${firstDeny} --`);
  spawnSync('node', [APPROVE, firstDeny], { encoding: 'utf8', env });
  console.log(`after approve   -> ${run(firstDenyPayload).permissionDecision}  (want allow)`);
  console.log(`re-run (1x use) -> ${run(firstDenyPayload).permissionDecision}  (want deny)`);
}
try { rmSync(STATE, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
