#!/bin/sh
# Boot-start the Claude Telegram agent inside a detached tmux session.
# Idempotent: exits 0 if the session already exists.
# Invoked by systemd (claude-agent.service on boot, claude-agent-watchdog.timer
# every 2 min as crash recovery).

SESSION=agent
export PATH="$HOME/.bun/bin:/usr/local/bin:/usr/bin:/bin"

# The boot service and the watchdog can race; only one starter at a time.
exec 9>/tmp/start-agent.lock
flock -n 9 || exit 0

if tmux has-session -t "$SESSION" 2>/dev/null; then
  exit 0
fi

tmux new-session -d -s "$SESSION" 'claude --channels plugin:telegram@claude-plugins-official'

# A fresh TUI can show startup dialogs. Poll for 60s and answer each:
# - workspace trust: "Yes, I trust" is preselected -> Enter
# - bypass-permissions warning: preselected option is "No, exit" -> press "2"
#   for "Yes, I accept". NEVER send arrow keys here: tmux delivers Down as
#   ESC [ B and the dialog reads the ESC as cancel, which exits claude.
i=0
while [ "$i" -lt 12 ]; do
  sleep 5
  if ! tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "tmux session died during startup" >&2
    exit 1
  fi
  pane=$(tmux capture-pane -t "$SESSION" -p 2>/dev/null)
  if echo "$pane" | grep -qiE "trust this folder|do you trust"; then
    tmux send-keys -t "$SESSION" Enter
  elif echo "$pane" | grep -q "Yes, I accept"; then
    tmux send-keys -t "$SESSION" 2
    sleep 1
    tmux send-keys -t "$SESSION" Enter
  fi
  i=$((i + 1))
done

exit 0
