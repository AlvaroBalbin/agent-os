# Setup: cheap-hands model routing

Goal: keep judgment on a top-tier model (the brain) and push high-volume execution to a cheap model (the hands),
without leaking sensitive data to a hosted third party.

## Option A - Claude Code Router (recommended, one flow)
`@musistudio/claude-code-router` is a proxy that routes each request to a provider by task type.
```bash
npm install -g @musistudio/claude-code-router
cp config/ccr-config.json ~/.claude-code-router/config.json   # then set the API keys / verify base URLs
```
Env: `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY`, optional `ZAI_API_KEY`. Launch the agent through the router.
Routing (in `ccr-config.json`): default/think/longContext -> brain (Opus/Fable); background/webSearch -> cheap
(DeepSeek). Background on DeepSeek is ~50x cheaper than Opus and is the single biggest cost win.
Per-subagent cheap routing: prefix a subagent prompt with `<CCR-SUBAGENT-MODEL>deepseek,deepseek-chat</CCR-SUBAGENT-MODEL>`.

Keep edits on the brain. Every cheap model I tried eventually fumbles a code edit (wrong line numbers,
malformed hunks), so they get reads, sweeps and drafts only.

## Option B - direct cheap model (simplest, no router)
A separate agent instance pointed at a cheap provider's Anthropic-compatible endpoint, used ONLY for no-PII
mechanical repos:
```jsonc
// an isolated settings.json for that instance
{ "env": {
  "ANTHROPIC_BASE_URL": "https://api.z.ai/api/anthropic",
  "ANTHROPIC_AUTH_TOKEN": "<zai key>"
} }
```
Keep your MAIN instance on real Anthropic for anything touching user/personal data.

## The privacy line (do not skip)
GLM and DeepSeek hosted APIs are China-hosted. Personal/identity data, private files, secrets, and user PII must
NEVER go to them. Two safe ways to still use cheap models:
- Hosted cheap API for no-PII mechanical CODE only.
- Self-host the open GLM weights on your own box for work near sensitive data (nothing leaves your infra).
Enforce by routing PII-touching tasks to the brain (Anthropic) or the self-hosted model; the router's cheap
providers should only ever see non-sensitive code and public text. See `config/routing.json`.

## Verify
Run a broad read-only sweep and confirm (router logs) it went to the cheap model; run a code edit and confirm it
went to the brain. Confirm no PII-touching task is routed to a hosted cheap provider.

## Note
Native Claude Code subagent model-override has had a bug where it resolves to the parent model; the router's
`<CCR-SUBAGENT-MODEL>` tag is the reliable mechanism.
