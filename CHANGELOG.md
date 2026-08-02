# Changelog

## [2.0.0] - 2026-08-02

Full arsenal orchestration — the skill now uses your whole installed design toolchain instead of whatever Claude happens to reach for.

- **Arsenal scan** (`scripts/scan-arsenal.mjs`): dependency-free Node scan of skills, MCP servers, plugins and PATH CLIs; frontmatter-only, mtime-cached, classified into eight design categories
- **Arsenal picker** (`scripts/picker.mjs`): local page with one card per tool ("specialised in …"), everything pre-selected, opt-out instead of opt-in, `needs you in the loop` flags, improvement-brief field, DE/EN UI; three return channels (local endpoint, copy token, JSON download)
- **Parallel worlds instead of one build**: selected tools are cut into 3–6 bundles, each builds a real runnable variant in its own worktree — every selected tool lands in exactly one bundle
- **Structured merge**: judge panel plus external AI tutors (Codex, Gemini, with images) pick the structurally strongest base, remaining strengths are grafted in via a transplant table with explicit adopt/reject reasons
- **Improvement gate** per stage: change quota plus a blind before/after league verdict; one retry, otherwise the shortfall is declared in the report
- **Design baseline** extracted into `reference/design-basis.md` as mandatory reading for every agent

## [1.1.0] - 2026-07-25

Field-proven additions to the built-in design baseline (from a production polish run):

- **Reference world**: Stage 5x must name a concrete real-world reference class before building — abstract adjectives produce slop
- **Iconography standard**: multi-layer material bodies instead of outline glyphs, motifs checked against real content, numbers embossed into the motif, benchmarked against the project's best existing asset
- **Stage/canvas physics**: watermark-typography box clipping, drag-surface hygiene (user-select/pointer cleanup), semantic snap anchors with viewport-filling focus

## [1.0.0] - 2026-07-24

Initial public release.

- Fixed 5-phase amplification workflow: Stage 5x → Judge 1 (Critic) → Stage 10x → Judge 2 (Minimalist) → Stage +3x
- Resource inventory step (unused skills/MCPs) as basis for the next amplification jump
- Sign-off gates per stage: build, desktop/mobile screenshots, motion/video analysis, code review
- Claude Code plugin packaging (`.claude-plugin/plugin.json` + `marketplace.json`)
