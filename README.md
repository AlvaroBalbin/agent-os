# agent-os

A personal agent operating system. Drive AI agents from your phone, message-in / work-out, across all your
projects and your whole machine - cheaply and safely.

It is not a new agent. It is the missing scaffolding around Claude Code (and any compatible agent) that makes
"just tell it what to do" actually workable for a solo operator:

- **Brain / hands model split** - a top-tier model does judgment; a cheap model does high-volume execution. You
  stop paying premium prices for reading and boilerplate. (See `config/routing.json`, `docs/model-tiers.md`.)
- **A config-driven approval gate** - anything that spends money, sends something outbound, deploys to prod, or
  destroys data is BLOCKED until you approve it from your phone. Everything else (read, draft, build, test) runs
  free. Fails closed. (See `hooks/costed-action-guard.mjs`, `config/guard.rules.json`.)
- **Phone-driven** - message a running agent from Telegram/iMessage/WhatsApp; it executes with full tool access
  and replies in the same chat. (See `docs/setup-host.md`.)
- **Portable + versioned** - one repo, one installer, works on your laptop and a $5 VPS.

The design principle: **autonomous on read/draft/build, gated on spend/send/deploy/destroy.** That is the correct
safety line for a solo founder, and it is enforced in code, not left to the model's judgment.

## Quickstart
```bash
# 1. see what the guard would gate (no changes made)
node test/guard.test.mjs

# 2. preview wiring the guard into your Claude Code settings (writes nothing)
node install.mjs --dry-run

# 3. when ready (ideally on your always-on host), wire it in (backs up settings.json first)
node install.mjs

# approve a gated action by id (what the guard hands you when it blocks something)
node bin/approve.mjs <action-id>

# see recent gated activity
node bin/audit.mjs
```

Then follow `docs/setup-host.md` (always-on box + phone bridge) and `docs/setup-routing.md` (cheap-hands routing).

## Layout
```
config/     guard.rules.json (policy), routing.json (model policy), ccr-config.json (router config)
rulepacks/  general.json (any project) + socialgravity.json (example domain pack); add your own, list in enabledPacks
hooks/      costed-action-guard.mjs   the PreToolUse approval gate (config-driven, self-locating, fails closed)
bin/        approve.mjs, audit.mjs
skills/     dispatch/  the phone-message -> action routing discipline (a Claude Code skill)
docs/       setup-host.md, setup-routing.md, model-tiers.md
test/       guard.test.mjs
install.mjs  idempotent installer (backs up settings.json)
```

## Adapting to a new project
Copy `rulepacks/socialgravity.json` to `rulepacks/<yourproject>.json`, add your costed/outbound command patterns,
and add the pack name to `enabledPacks` in `config/guard.rules.json`. Nothing else changes.

## Safety notes
- The gate is only as good as its patterns. It fails closed and errs toward gating, but review `rulepacks/*` for
  your stack. Add anything that spends or destroys.
- Never route personal/identity data to a cheap HOSTED model. See the privacy line in `config/routing.json`.
- Installing makes the gate live for every session using that `settings.json`, including parallel agents. Prefer
  the dedicated host.

See `ARCHITECTURE.md` for the why behind each piece.
