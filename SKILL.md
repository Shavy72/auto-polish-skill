---
name: auto-polish
description: "Mandatory final phase for every new UI/frontend build (feature, page, component, redesign, full app) — runs automatically, without the user asking. Mini-addons (<~30 changed lines) only on demand via /auto-polish. Runs a dynamic multi-agent workflow with fixed amplification stages 5x → 10x → +3x and design judges in between, including a resource inventory (which installed skills/MCPs are still unused?), sign-off from every angle (desktop, mobile, code, video for animations) — local first, then live after shipping. Triggers (DE+EN): feature finished, polish phase, 'auto-polish', 'polish das', 'maximal geiler machen', 'showcase level', 'design steigern'."
---

# auto-polish — Factorial design amplification as a self-review end phase

Origin: a real production session (2026-07-24). The brief, verbatim in spirit: make it 5x better,
look at it, then 10x better in every conceivable way, look again, then calculate what one more
3x jump would take — and ALWAYS check which installed skills/MCPs are still unused.

## When (binding)

- **Automatically** as the LAST phase once a new UI feature, page/component, redesign or app is
  functionally complete and build-green — the user must NOT have to ask.
- **On demand** (`/auto-polish [area]`) for mini-addons (<~30 changed lines), bugfixes, copy tweaks.
- No skipping for cost reasons without asking — "always" was an explicit user decision.

### Invocation (`/auto-polish [area]`) — the argument is OPTIONAL

**Without an argument** the skill starts dynamically: target = the most recently built/changed
UI of the session (session context, else `git diff`/recent commits on UI files). No UI target
determinable → one short question instead of guessing.

**With an argument** it names an APP AREA in user language (e.g. `Leaderboard`, `Shift plan`,
`Task wizard`) — not a file path. Flow:
1. **Resolve:** area → target file(s) via grep (route/sidebar label/component name);
   ambiguous or >3 candidates → a read-only explore agent, NEVER guess.
2. Briefly state the resolved files + 1-line scope (only ask back if the match is ambiguous,
   otherwise start right away).
3. Launch the dynamic workflow with those files as the FILE parameter (schema below).

## Flow: Workflow tool with exactly 5 phases — each with its OWN focus (fixed, no open end)

`Workflow` with phases and role dramaturgy (goal: the sweet spot, not maximum decoration):

| Phase | Role | Focus |
|---|---|---|
| Stage 5x | **Maximalist** | Build substance: layers, light, proportion, motion foundation |
| Judge 1 | **Critic** | Hardest audit of ALL dimensions incl. **copy** (button labels! titles, microcopy: word choice, tone, length, seductiveness) + resource inventory + **second opinion from an external model (e.g. Codex CLI)** |
| Stage 10x | **Amplifier** | Judge feedback in full + copy fixes + further amplification in every conceivable way |
| Judge 2 | **Minimalist** | "What is TOO MUCH? Would removing it make it stronger?" — every ingredient must justify itself; kitsch/endless loops/redundant words go on the cut list; sweet-spot diagnosis |
| Stage +3x | **Sweet-spot finisher** | Final 3 amplifications AND all removals — end state: elegant restraint |

Executors/judges always with an explicit strong model (never inherit the orchestrator model blindly).

### External second opinion (cost-disciplined, no blind adding)

- **Judge 1 gets exactly ONE second opinion** from an external model (e.g. `codex` CLI via Bash):
  input = the target file(s) as code **+ the current stage screenshot as an image** (`codex -i <shot>.png`
  or your CLI's image attachment; no image support → describe the screenshot briefly in words)
  + the concrete question ("critique design + copy, what's missing, what's too much?") —
  never the whole repo, never multiple rounds. CLI missing/failing → skip and declare it.
- **A multi-model council only on a genuine stalemate** (judges fundamentally contradict each
  other) — otherwise no committee theater; cost efficiency wins.
- This file is meant to be fine-tuned continuously in use — keep changes lean, don't bolt on.

### Builder stages (5x / 10x / +3x)

- Work ONLY on the target files (+ a throwaway harness). Functionality/handlers/positioning
  untouched, no new dependencies, project-wide token files (e.g. a global index.css) untouched.
- **Done means done:** a stage only ends with build exit 0 — half stages are forbidden.
- Stage +3x implements Judge 2's feedback AND removes what was flagged as kitsch
  (premium = restraint in the right place; endless loops at rest are slop).

### Sign-off gates per stage (every angle, local first)

1. **Build:** project build (e.g. `npm run build`) exit 0 — proof in the agent output.
2. **Desktop render:** screenshot 1280×800 via harness (throwaway `verify-*.html` + dev server on
   a free port + `npx playwright screenshot`; install chromium on demand).
3. **Mobile render:** same harness at `--viewport-size=390,844`.
4. **Motion/video:** as soon as the stage contains animation: record a short interaction with
   Playwright `recordVideo` (.webm) and analyze it — preferably with a video-analysis MCP,
   fallback: a frame series (3–5 screenshots across the animation). Static screenshots alone
   prove NOTHING about motion.
5. **Code angle:** short review inside the judge: reduced-motion guard, no emojis,
   transform/opacity only, timer cleanup, a11y labels.

### Judge duties (both rounds)

- Score 1–10 + the most impactful CONCRETE amplifications (directly actionable, no platitudes).
- **Copy audit is a mandatory dimension:** button labels, titles, sublines — does every phrase
  land, does the CTA text seduce the click, is every word necessary? Copy findings count like
  design findings.
- **Resource inventory (MANDATORY, basis for calculating the next jump):** which installed
  design skills and connected MCPs are relevant for THIS target and NOT yet exhausted?
  **Listing is NOT enough** (learned in the first production run): actually Read the 2–3 most
  relevant SKILL.md files and apply their checklists/detectors to the target (e.g. anti-slop
  tells as an audit list, layout-diagnosis heuristics); concrete excerpts + findings go into
  the feedback for the next builder as quotes — derive the amplification jump from that.
- Judge 2 additionally: "What has become excessive/kitsch and must be rolled back?"
- Judges evaluate screenshots/videos first (vision), code second.

## Dynamic resource discovery (before launching the workflow, main session)

This skill is portable — every user has different skills/MCPs/plugins installed. So BEFORE
starting, detect what actually exists and inject it into the agent prompts (hardcode nothing;
every name in this document is only an example):
1. **Skills:** list installed skills (session skill list or `ls ~/.claude/skills`) and filter
   the design-relevant ones.
2. **MCPs/tools:** check connected MCPs (session tools / `claude mcp list`) — especially:
   what can THIS user render/inspect designs with (real-browser MCP, Playwright, DevTools MCP)?
   What can analyze video? Which component/font/design MCPs exist?
3. **External CLIs:** second-opinion models (e.g. codex) available?
The result (concrete names + purpose) is passed to builders/judges as an "AVAILABLE RESOURCES"
block; every agent MUST include a line `RESOURCES USED: <name → for what>` in its output
(this feeds the report below).

### Skill inclusion is MANDATORY READING in EVERY agent prompt (not just inventory!)

Learned the hard way in production: design skills must NOT merely be listed, or "distilled"
into the prompts by the orchestrator — the agents read them THEMSELVES. Concretely: the main
session writes a block into every builder/judge prompt:
`MANDATORY READING (Read before working, apply the checklists, quote the applied rules in
your output): <absolute SKILL.md paths>` — tailored per role (example mapping, adapt
dynamically to the user's installed skills):
- **Maximalist:** construction skills (e.g. layout/craft/motion-foundation skills)
- **Critic:** audit skills (e.g. layout diagnosis, anti-slop tell catalogs as checklists)
- **Amplifier:** motion/interaction skills
- **Minimalist:** reduction skills (anti-slop, minimalism)
- **Finisher:** polish skills (responsive polish, interface feel)
Max 2–3 files per agent (focus beats volume). An agent whose output quotes no applied
skill rules has NOT passed its gate.

### Built-in design baseline (distilled from the best design skills — ALWAYS applies, even without them)

This catalog goes verbatim into every agent prompt; the user's own skills stack on top:
- **Layout:** 8pt grid (4px only as half-step) · no dead areas — whitespace is a decision,
  not a leftover · alignment consistency · touch targets ≥44px · line length 45–75 chars.
- **Type:** hierarchy via size AND weight AND color (never size alone) · titles concise
  (≤6 words) · body calm (rgba white ~.6–.75 on dark) · tabular-nums for numbers.
- **Light/depth:** ONE light source per surface · light tells the material story (specular
  edge on top, shadow below, accent color as a light source, not a fill) · glow soup = slop.
- **Motion:** transform/opacity only · spring/ease curves, never linear · movement needs
  semantics (the object's real mechanics), entrances once instead of endless loops ·
  UI 150–450 ms, ambient 4–8 s · full prefers-reduced-motion with sensible end states.
- **Anti-slop:** no emojis as icons · no stock Tailwind shadows/template gradients ·
  no radius mixing · max one dominant accent color · rest state is still · nothing that
  reads as a "generated hero template".
- **Feel:** hover = light on (not color swap) · active = scale ~.97 · visible focus ·
  design the empty/loading/error states too.
- **Copy:** CTA = verb + concrete benefit · every word earns its place · microcopy talks
  to the user, not about the feature.
- **Reference world (Stage 5x picks it BEFORE building, one sentence in the prompt):**
  abstract adjectives ("premium", "modern") produce slop — name a concrete real-world
  reference class (AAA skill tree/quest map, blueprint/construction plan, watch complication,
  hi-fi faceplate …) and translate it into the PROJECT's material language; never copy the
  foreign style verbatim. (Field-proven: a "video game skill tree + blueprint grid" directive
  was the quality leap where "more glass/glow" was not.)
- **Iconography:** thin outline glyphs in circles = cheap. A premium icon is a multi-layer
  material body (gradient fill, light from above, dark depth edge, specular highlight; shared
  SVG defs instead of per-instance filters) · every motif must tell the CONCRETE content —
  check the icon map against the real titles/data and replace filler motifs (abstract circle,
  decorative gear) · emboss numbers/variants into the motif instead of sticking on a badge ·
  quality benchmark: the project's best existing asset, compared side-by-side via screenshot.
- **Stage/canvas physics:** watermark typography must fit ENTIRELY inside its element box
  (mask/text-stroke clip at the box → hard cut edges; line-height 1, widen the box) ·
  drag surfaces: user-select none + dragstart prevention + pointer cleanup
  (pointercancel/blur) · free scrolling snaps to semantic anchors on release — the focused
  section centers and FILLS the viewport, neighbors only peeking in; content vertically
  centered, no dead half-field below the chain.

## Polish report (mandatory output at the end, always)

The main session closes EVERY run with a compact audit report (in the final answer, or as a
file if space is tight):

| Phase | Role | Roughly did | Skills/MCPs/CLIs used |
|---|---|---|---|

Plus: judge scores (before/after), the Minimalist's cut list (what is deliberately NOT in),
proof list (build/screenshots/video/live), and relevant resources that went unused with a
one-sentence reason. The report makes every run traceable and fine-tunable for the user.

## Wrap-up (main session, not the workflow)

1. The workflow NEVER commits/pushes — the main session inspects the final screenshots
   (+ video verdict) ITSELF, diff-reviews against the rules, then commits/ships per project doctrine.
2. **Live sign-off:** after deploying, open the live URL in a real browser and actually look at /
   interact with the polished area — passing locally ≠ done; the live proof belongs in the final answer.
3. Harness leftovers are deleted (git status clean), screenshots live in a scratch directory.
4. Declare open items (e.g. final iPhone/WebKit sign-off for mobile-critical projects).
