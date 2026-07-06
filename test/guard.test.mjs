// Test harness for the config-driven guard. Run: node test/guard.test.mjs
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { rmSync } from 'node:fs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const GUARD = join(ROOT, 'hooks', 'costed-action-guard.mjs');
const APPROVE = join(ROOT, 'bin', 'approve.mjs');
try { rmSync(join(ROOT, 'state'), { recursive: true, force: true }); } catch {}

const cases = [
  ['Read (safe)',              { tool_name: 'Read', tool_input: { file_path: '/x' } }, 'allow'],
  ['Bash ls (safe)',           { tool_name: 'Bash', tool_input: { command: 'ls -la' } }, 'allow'],
  ['git commit (safe)',        { tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }, 'allow'],
  ['git push feature (safe)',  { tool_name: 'Bash', tool_input: { command: 'git push origin HEAD:refs/heads/feat/x' } }, 'allow'],
  ['SQL SELECT (safe)',        { tool_name: 'mcp__x__execute_sql', tool_input: { query: 'select 1' } }, 'allow'],
  ['npm install (safe)',       { tool_name: 'Bash', tool_input: { command: 'npm install lodash' } }, 'allow'],
  ['SQL INSERT (gate)',        { tool_name: 'mcp__x__execute_sql', tool_input: { query: 'insert into t values (1)' } }, 'deny'],
  ['Resend send (gate)',       { tool_name: 'mcp__resend__send-email', tool_input: { to: 'a' } }, 'deny'],
  ['WhatsApp send (gate)',     { tool_name: 'mcp__whatsapp__send_message', tool_input: { text: 'hi' } }, 'deny'],
  ['railway up (gate)',        { tool_name: 'Bash', tool_input: { command: 'railway up' } }, 'deny'],
  ['git push main (gate)',     { tool_name: 'Bash', tool_input: { command: 'git push origin main' } }, 'deny'],
  ['git push --force (gate)',  { tool_name: 'Bash', tool_input: { command: 'git push origin feat --force' } }, 'deny'],
  ['rm -rf (gate)',            { tool_name: 'Bash', tool_input: { command: 'rm -rf ./build' } }, 'deny'],
  ['vercel deploy (gate)',     { tool_name: 'Bash', tool_input: { command: 'vercel deploy --prod' } }, 'deny'],
  ['npm publish (gate)',       { tool_name: 'Bash', tool_input: { command: 'npm publish' } }, 'deny'],
  ['SG mint (gate)',           { tool_name: 'Bash', tool_input: { command: 'node scripts/mint.mjs' } }, 'deny'],
  ['npm run ship (gate)',      { tool_name: 'Bash', tool_input: { command: 'npm run ship:widget' } }, 'deny'],
];

const run = (p) => { const r = spawnSync('node', [GUARD], { input: JSON.stringify(p), encoding: 'utf8' });
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
  spawnSync('node', [APPROVE, firstDeny], { encoding: 'utf8' });
  console.log(`after approve   -> ${run(firstDenyPayload).permissionDecision}  (want allow)`);
  console.log(`re-run (1x use) -> ${run(firstDenyPayload).permissionDecision}  (want deny)`);
}
try { rmSync(join(ROOT, 'state'), { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
