# Setup: control the agent from Telegram (~5 min)

Uses Claude Code Channels (official). You message a Telegram bot; a running Claude Code session on your host
executes with full tool access and replies in the same chat. It logs in with your Claude account (Max works) -
no API key needed.

## Requirements
- Claude Code v2.1.80+  (`claude --version`)
- Logged in with your Claude account: `claude login` (use your Max plan)
- Bun runtime on the host: `curl -fsSL https://bun.sh/install | bash`
- The session must STAY RUNNING (run it inside tmux on the host, see setup-host.md)

## Steps
1. Create the bot: open **BotFather** in Telegram -> `/newbot` -> pick a name and a username ending in `bot` ->
   copy the token it gives you.
2. In Claude Code (on the host), register the plugin marketplace (first time only):
   ```
   /plugin marketplace add anthropics/claude-plugins-official
   ```
3. Install the Telegram plugin:
   ```
   /plugin install telegram@claude-plugins-official
   ```
4. Configure it with your bot token:
   ```
   /telegram:configure <YOUR_BOT_TOKEN>
   ```
5. Start Claude Code with the channel (do this inside tmux so it survives disconnects):
   ```
   claude --channels plugin:telegram@claude-plugins-official
   ```
6. Open Telegram, send any message to your bot; it replies with a pairing code; enter that code back in Claude
   Code to link them.

## Verify
From your phone, send a read-only ask ("what's the git status of agent-os"). You should get a reply. Then send a
costed action ("send a test email to myself") - the approval guard must DENY it and ask you to approve. If both
behave, the loop works.

## Good to know
- No message history: Telegram's Bot API does not provide it, so the session is the memory. Your `~/.claude`
  memory + skills still load normally.
- Attachments up to 50MB work.
- The approval loop: when the guard blocks something it gives you an action id; reply "approve <id>", the
  orchestrator runs `node ~/agent-os/bin/approve.mjs <id>` and retries once. The `dispatch` skill handles this.
- Security: anyone who can message your bot can drive your agent. Keep the bot token secret; the pairing step
  binds it to your session. Do not share the bot. The approval gate is your backstop for costed/destructive actions.
