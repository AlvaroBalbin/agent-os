# Architecture

The goal: text an instruction from your phone and have agents get it done, across all your projects, without
(a) paying premium model prices for cheap work, or (b) risking an agent spending money / sending something /
destroying data without your say-so. Everything here serves those two constraints.

## The layers
```
  PHONE (Telegram / iMessage / WhatsApp)
    | message in, result out
  PHONE BRIDGE (Claude Code Channels, or OpenClaw for WhatsApp)
    |
  ALWAYS-ON HOST (VPS or Mac mini, agent under tmux/pm2 so the session survives)
    |
  ORCHESTRATOR = agent on the BRAIN model
    |  routes via the `dispatch` skill
    +--> HANDS (cheap model) for reads / sweeps / drafts / mechanical work
    +--> project SKILLS + SUBAGENTS for known operations
    |
  APPROVAL GATE (PreToolUse hook) -- blocks costed/outbound/destructive until you approve from your phone
    |
  RESULT back to your phone
  + AUTONOMY LAYER (cron): proactive loops that run themselves and ping you
```

## 1. The brain/hands split (cost)
Judgment is rare and worth a premium model; execution is frequent and cheap. So route by task:
- BRAIN (top-tier: Claude Opus/Fable): planning, architecture, decisions, and the actual code EDITS.
- HANDS (cheap: DeepSeek/GLM): reading, sweeping, drafting, log parsing, research fan-out.
Cheap models are demonstrably worse at edits (wrong line numbers, malformed diffs), so they READ and DRAFT; the
brain EDITS. Wiring is done by Claude Code Router (`config/ccr-config.json`, `docs/setup-routing.md`). This is the
same "cheap parallel readers feeding one expensive writer" shape that good agent orchestration already uses.

Why not a cheaper top model: as of Jul 2026 there is none. SWE-bench Verified: Fable 5 95.0, Opus 4.8 88.6, best
non-Anthropic (GPT-5.5) 82.6, GLM/DeepSeek ~77-80. The brain is already the best affordable option; do not chase a
cheap Fable that does not exist. `docs/model-tiers.md` has the full table.

## 2. The approval gate (safety) - the core of this repo
A single PreToolUse hook (`hooks/costed-action-guard.mjs`) sees every tool call before it runs and decides:
allow / deny / gate. It is CONFIG-DRIVEN: policy lives in `config/guard.rules.json` (categories -> policy), and
the match PATTERNS live in `rulepacks/*.json` (merged by `enabledPacks`). Categories: outbound_comms, deploy,
db_write, spend, destructive, publish. Add your own.

Design choices and why:
- **Fails closed.** Unknown/ambiguous costed things are denied, not allowed. A missed gate is worse than a false stop.
- **Category-based, not hardcoded.** New projects add a rulepack; the engine does not change.
- **Single-use, deterministic approval.** A gated call hashes to a stable 8-char id. You approve that id once
  (`bin/approve.mjs`), the guard allows exactly that call once, then consumes the approval. Re-doing it asks again.
- **Auditable.** Every gated request is appended to `state/pending.jsonl`; `bin/audit.mjs` shows it.
- **Self-locating + state out of git.** The hook finds its config from its own path (works in-repo and installed);
  runtime state lives in `state/` (gitignored, per-machine).

The result is the safety property that makes unattended, phone-driven operation acceptable: the agent can read,
think, draft, and build all day; the moment it tries to spend, send, deploy, or destroy, it stops and asks you.

## 3. The dispatch discipline
`skills/dispatch/SKILL.md` is the routing playbook the orchestrator loads when a phone message arrives: classify
intent, run reads on the hands model, keep judgment on the brain, invoke known skills over improvising, and honor
the gate. It keeps phone-driven autonomy predictable instead of ad hoc.

## 4. The host + bridge (reach)
The agent must outlive your laptop, so it runs on an always-on box under a persistent process. The phone bridge
(Claude Code Channels or OpenClaw) is just an I/O channel into that running agent. `docs/setup-host.md`.

## What this is NOT
- Not a replacement for judgment: the brain stays in the loop for decisions; the win is it is cheap-per-use.
- Not fully hands-off: costed/outbound actions are gated by design. That is the point.
- Not a lock-in: models, bridge, and rulepacks are all swappable config.
