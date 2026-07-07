#!/usr/bin/env node
/*
 * agent-os installer. Wires the PreToolUse approval guard into ~/.claude/settings.json.
 * Idempotent + backs up settings first. Run a dry run before committing to it:
 *   node install.mjs --dry-run   # shows the change, writes nothing
 *   node install.mjs             # backs up settings.json, wires the hook
 *
 * NOTE: this makes the gate LIVE for every Claude Code session using this settings.json - including
 * interactive ones and any parallel agents. Prefer installing on the dedicated always-on host, or only
 * when you are ready for the gate to apply here. Uninstall = remove the hook entry (backup is kept).
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes('--dry-run');
const settingsPath = join(homedir(), '.claude', 'settings.json');
const settingsDir = dirname(settingsPath);
const hookPath = join(ROOT, 'hooks', 'costed-action-guard.mjs').replace(/\\/g, '/');
const command = `node "${hookPath}"`;

let settings = {};
if (existsSync(settingsPath)) {
  try { settings = JSON.parse(readFileSync(settingsPath, 'utf8')); }
  catch (e) { console.error(`Could not parse ${settingsPath}: ${e.message}. Aborting.`); process.exit(1); }
}

settings.hooks ||= {};
settings.hooks.PreToolUse ||= [];

const already = settings.hooks.PreToolUse.some((g) =>
  (g.hooks || []).some((h) => (h.command || '').includes('costed-action-guard.mjs')));

if (already) { console.log('agent-os guard already wired in settings.json. Nothing to do.'); process.exit(0); }

settings.hooks.PreToolUse.push({ matcher: '*', hooks: [{ type: 'command', command }] });

const preview = JSON.stringify({ hooks: { PreToolUse: settings.hooks.PreToolUse } }, null, 2);
console.log(`Target: ${settingsPath}`);
console.log(`Hook:   ${command}\n`);
console.log('Resulting PreToolUse block:\n' + preview + '\n');

if (DRY) { console.log('DRY RUN - nothing written. Re-run without --dry-run to apply.'); process.exit(0); }

if (existsSync(settingsPath)) {
  const bak = `${settingsPath}.bak.${new Date().toISOString().replace(/[:.]/g, '-')}`;
  copyFileSync(settingsPath, bak);
  console.log(`Backed up existing settings to ${bak}`);
} else {
  mkdirSync(settingsDir, { recursive: true });
  console.log(`Created ${settingsDir}`);
}
writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
console.log('Guard installed. It is now live for sessions using this settings.json.');
console.log('Verify: from a session, attempt a costed action (e.g. a send) - it must be denied and ask for approval.');
