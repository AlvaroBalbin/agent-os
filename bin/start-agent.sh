#!/bin/sh
# Boot-start the Claude Telegram agent inside a detached tmux session.
# Idempotent: exits 0 if the session already exists.
# Invoked by systemd (claude-agent.service) as user alvaro.

SESSION=agent
export PATH="$HOME/.bun/bin:/usr/local/bin:/usr/bin:/bin"

if tmux has-session -t "$SESSION" 2>/dev/null; then
  exit 0
fi

tmux new-session -d -s "$SESSION" 'claude --channels plugin:telegram@claude-plugins-official'

# A fresh TUI can show the workspace-trust prompt; Enter accepts option 1.
# Poll up to 60s; if the prompt never appears, that's fine too.
i=0
while [ "$i" -lt 12 ]; do
  sleep 5
  if ! tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "tmux session died during startup" >&2
    exit 1
  fi
  if tmux capture-pane -t "$SESSION" -p 2>/dev/null | grep -qiE "trust this folder|do you trust"; then
    tmux send-keys -t "$SESSION" Enter
    break
  fi
  i=$((i + 1))
done

exit 0
