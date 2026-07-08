# Model tiers (the honest picture, Jul 2026)

Use this to pick what runs where. Numbers are SWE-bench Verified as of July 2026 (a coding proxy; the judgment gap
between tiers is wider than the coding gap).

| Model | SWE-bench Verified | Tier | Role |
|---|---|---|---|
| Claude Mythos 5 | 95.5 | frontier (Anthropic) | brain (rare top) |
| Claude Fable 5 | 95.0 | frontier (Anthropic) | brain (hardest calls) |
| **Claude Opus 4.8** | **88.6** | frontier (Anthropic) | **brain (daily driver, e.g. on a Max plan)** |
| GPT-5.5 | 82.6 | strong | alt brain |
| Claude Opus 4.7 | 82.0 | strong | - |
| Kimi K2.6 | 80.2 | near-frontier (open) | strong hands |
| Gemini 3.5 Flash | 78.8 | fast | hands |
| GLM-5.x | ~77-80 | near-frontier (open weights) | hands (self-hostable) |
| DeepSeek V4 | ~77-80 | cheapest near-frontier | hands (background, ~50x cheaper than Opus) |

## The two conclusions
1. **There is no Fable-level model outside Anthropic.** The best non-Anthropic model (GPT-5.5, 82.6) is a full tier
   below Opus 4.8. Do not hunt for a cheap top model - it does not exist. If you already have Opus via a Max plan,
   your brain is already the best affordable option; for the rare hardest call, bump to Fable within Claude.
2. **The cheap models earn their place as hands, not brains.** GLM ($18/mo flat, Claude-Code-native, open weights)
   and DeepSeek (cheapest per-token) are ~Sonnet-class: great for reads, sweeps, drafts, mechanical work; poor at
   edits and hard reasoning. Read and draft on them; edit and decide on the brain.

## Cost shape for a solo operator
- Brain: whatever plan you already pay for (e.g. Claude Max). Marginal cost ~zero for judgment.
- Hands: GLM $18/mo flat, and/or DeepSeek pay-as-you-go (pennies for background volume).
- Host: $5-20/mo VPS.
Total new spend to go phone-driven + cheap-hands: ~$25-40/mo. There is no expensive tier to buy; the expensive
model is already sunk.

Sources (Jul 2026): SWE-bench Verified leaderboards (llm-stats, swebench.com); GLM Coding Plan pricing; DeepSeek
API pricing; Claude Code Router docs. The leaderboard moves monthly, so treat the digits as a snapshot.
