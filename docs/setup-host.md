# Setup: always-on host + phone bridge

The agent has to keep running when your laptop is closed, so it lives on an always-on box and you message it.

## 1. The box
- A $5-20/mo VPS (Hetzner / DigitalOcean / Fly) or a Mac mini you leave on. A laptop works to start but must stay awake.
- Install: git, node (v20+), the agent CLI (Claude Code), your repos, and your `~/.claude` (skills, agents, hooks,
  memory, settings). Clone this repo somewhere stable, e.g. `~/agent-os`.
- Keep the agent session alive with a persistent process so it survives disconnects:
  - Linux: `tmux new -s agent` then run the agent inside; or a systemd/pm2 service.
  - Mac: tmux, or a `launchd` agent.
  This is THE constraint every phone-control guide flags: the session must stay running.

## 2. Wire the safety gate FIRST
Before anything can act unattended, install the approval guard (see repo README):
```bash
cd ~/agent-os
node install.mjs --dry-run   # review
node install.mjs             # wire it into ~/.claude/settings.json (backs up first)
```
Verify: attempt a costed action; it must be denied and ask for approval.

## 3. The phone bridge
- Telegram / iMessage / Discord: use **Claude Code Channels** (Anthropic official). Message in, work runs with full
  filesystem + MCP + git, replies in the same chat. Recommended control channel: Telegram (most mature).
- WhatsApp: use **OpenClaw** (open source) which supports WhatsApp, or keep WhatsApp for push-notifications-out and
  control from Telegram.
- Verify: from your phone, ask a read-only question ("what's the git status of <repo>") and confirm it replies.

## 4. Approvals from your phone
When the guard blocks a costed action it returns an id (e.g. `3f9a1c02`) and the agent messages you to approve.
Reply "approve 3f9a1c02"; the orchestrator runs `node ~/agent-os/bin/approve.mjs 3f9a1c02` and retries once.
The `dispatch` skill encodes this loop.

## 5. Autonomy layer (optional, once the above works)
Schedule recurring loops on the box (cron, or the agent's scheduler) that run cheap and only ping you on something
real: a daily status/health sweep, a weekly digest, project-specific checks. Keep them read/draft only; anything
they want to send or deploy still hits the gate.

## Order of operations
box up -> gate wired + verified -> phone bridge verified on a read -> approval loop tested on one costed action
-> then let it run. Do not skip the gate verification.
