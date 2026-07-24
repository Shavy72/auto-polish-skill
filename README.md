# auto-polish

A [Claude Code](https://claude.com/claude-code) skill that turns the final design polish of any
UI/frontend build into a **fixed, multi-agent amplification pipeline**:

```
Stage 5x (Maximalist) → Judge 1 (Critic + copy audit + resource inventory + external
second opinion) → Stage 10x (Amplifier) → Judge 2 (Minimalist) → Stage +3x (Sweet-spot finisher)
```

Every stage must actually finish (build exit 0) and gets signed off from every angle:
desktop + mobile screenshots, a code review pass, and **video analysis for anything animated** —
locally first, live after shipping. The judges don't just add: the Minimalist round explicitly
hunts for what to *remove*, so the result lands on the sweet spot instead of maximum decoration.

Born from a real production session where "make this update button 5x better, look at it,
then 10x, then calculate one more 3x jump" produced dramatically better UI than a single
polish pass — and where a missed button-label critique taught the skill that copy is a
first-class design dimension.

## Install

Clone directly into your Claude Code skills directory:

```
git clone https://github.com/Shavy72/auto-polish-skill ~/.claude/skills/auto-polish
```

Alternatively, just copy `SKILL.md` into the same location:

```
~/.claude/skills/auto-polish/SKILL.md
```

To make it fire automatically, add a one-liner to your auto-active skills list in
`~/.claude/CLAUDE.md`, e.g.:

> **auto-polish** — mandatory end phase after every new UI/frontend build: workflow
> 5x → judge → 10x → judge → +3x with resource inventory + desktop/mobile/video gates.
> Mini-addons (<~30 lines) on demand only.

## Requirements

- Claude Code with the `Workflow` tool (multi-agent orchestration)
- Playwright available via `npx` for screenshots/video (installed on demand)
- Optional: an external CLI model for the second opinion (e.g. OpenAI Codex CLI),
  a video-analysis MCP for motion review

## Philosophy

- **Fixed stages, no open end** — predictable cost, proven dramaturgy.
- **Every phase has a different focus** — maximalism, critique, amplification, minimalism, finish.
- **Copy is design** — button labels and microcopy get audited as hard as pixels.
- **Inventory before adding** — judges must check which installed skills/MCPs are still unused
  and derive the next jump from that, instead of inventing generic advice.
- **Done means done** — no half stages; proof (build, screenshots, video) or it didn't happen.

This file is meant to be fine-tuned continuously in use. PRs and forks welcome.
