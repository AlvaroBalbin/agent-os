#!/usr/bin/env bash
# agent-os :: one-shot host bootstrap for a fresh Ubuntu VPS (22.04/24.04).
# Installs the runtime, clones agent-os, verifies the guard, wires it live, and prints the last human steps.
# Run as a normal sudo-capable user:  bash bootstrap-host.sh
# Version-sensitive lines are flagged VERIFY; re-check them against current docs.
set -euo pipefail

REPO_URL="${AGENT_OS_REPO:-https://github.com/AlvaroBalbin/agent-os.git}"   # private repo: run `gh auth login` on the host first, or pass AGENT_OS_REPO=...

echo "==> base packages"
sudo apt-get update -y
sudo apt-get install -y git curl tmux build-essential ca-certificates gnupg

echo "==> node 20 (Claude Code + guard need node)"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node --version

echo "==> bun (Claude Code Channels needs it)"
if ! command -v bun >/dev/null; then curl -fsSL https://bun.sh/install | bash; fi
export PATH="$HOME/.bun/bin:$PATH"

echo "==> gh (optional, for repo ops)"
if ! command -v gh >/dev/null; then sudo apt-get install -y gh || echo "  (install gh manually if apt lacks it)"; fi

echo "==> Claude Code CLI"                                   # VERIFY package name/version (need >=2.1.80)
if ! command -v claude >/dev/null; then npm install -g @anthropic-ai/claude-code; fi
claude --version || echo "  (confirm Claude Code installed and >=2.1.80)"

echo "==> clone agent-os"
cd "$HOME"
[ -d agent-os ] || git clone "$REPO_URL" agent-os
cd agent-os

echo "==> verify the approval guard (must be all green)"
node test/guard.test.mjs

echo "==> wire the guard live into ~/.claude/settings.json (backs up first)"
node install.mjs

cat <<'NEXT'

==============================================================
 agent-os host is bootstrapped. Last human steps:

 1. Log in to Claude Code with your Max account:   claude login
 2. Start a persistent session:                    tmux new -s agent
 3. Telegram control (see docs/setup-telegram.md):
      /plugin marketplace add anthropics/claude-plugins-official
      /plugin install telegram@claude-plugins-official
      /telegram:configure <YOUR_BOT_TOKEN>
      claude --channels plugin:telegram@claude-plugins-official
 4. Cheap hands (see docs/setup-routing.md): add GLM/DeepSeek keys + Claude Code Router.
 5. From your phone: read-only ask should work; a costed action must be DENIED and ask to approve.
==============================================================
NEXT
