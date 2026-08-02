---
name: auto-polish
description: "MANDATORY final phase after any new UI/frontend build (feature, page, component, redesign, app) — runs automatically, without the user asking. First scans the ENTIRE installed system (skills, MCPs, plugins, AI CLIs) for design capability, lets the user deselect what does not fit in the arsenal picker, then builds parallel variants in phase 1 using everything that remains, merges the winning strengths, and condenses across 5x → 10x → +3x with judges and external AI tutors. Small add-ons (<~30 changed lines) on demand only via /auto-polish. Triggers: feature finished, polish phase, 'auto-polish', 'polish this', 'make it 10x better', 'showcase quality', 'level up the design'."
---

# auto-polish — the whole arsenal, then deliberately condensed

**Two problems this skill solves:**
1. Good design skills sit unused because Claude reaches for the same two every time.
2. Claude never combines several design systems on its own, and never in service of a factorial
   improvement. Both are forced here — and the user never has to remember which of their skills
   would have been the right one.

**Core idea:** first build radically (parallel worlds in practice instead of theoretical weighing),
then merge the clear winners, then condense onto what demonstrably carries.

## When (binding)

- **Automatically** as the LAST phase, as soon as a new UI feature, page/component, redesign or app
  is functionally done and the build is green — the user does NOT have to ask for it.
- **On demand** (`/auto-polish [area]`) for small add-ons (<~30 changed lines), bugfixes, copy edits.
- Never skipped for cost reasons without asking first.

### Invocation

**Without an argument:** the target is the UI most recently built or changed in this session
(session context, otherwise `git diff` / latest commits touching UI files). If no target can be
determined, ask one short question instead of guessing.

**With an argument** = an app area in user language (`Leaderboard`, `Task wizard`), not a file path:
resolve area → target file(s) via grep (route / sidebar label / component name); if ambiguous or
more than three candidates, dispatch an explore agent (`model: sonnet`) — never guess.

---

## Phase 0 — arsenal discovery + picker (main session, the ONLY mandatory stop)

Visible progress is part of the product: the user should see their system being searched. Print a
status line before each step:

```
🔎 Arsenal scan … skills (260) → MCP servers → plugins → AI CLIs
✍️  Enriching descriptions … 12 new entries
🖥️  Picker starting at http://127.0.0.1:8848
```

1. **Scan:** `node ~/.claude/skills/auto-polish/scripts/scan-arsenal.mjs`
   Writes `inventory.json` (schema `auto-polish/inventory@1`): every design-relevant resource with
   `id · kind (skill|mcp|plugin|cli) · category · path · specialty · needsUser · enriched`.
   Frontmatter only, mtime-cached — a follow-up run takes seconds. `--force` forces a full rescan.
   Node ≥18, zero dependencies, runs on Windows/macOS/Linux.

2. **Enrich (once per resource, then never again):** split all entries with `enriched:false` into
   blocks of ~12 and dispatch ONE subagent per block, `model: sonnet`:
   > For each of these paths, read the SKILL.md and return a JSON array of
   > `{id, specialty, category, bestFor, needsUser}`.
   > `specialty` = one sentence, max 240 characters, concrete: what is this tool specialised in,
   > what does it do better than a generic agent? No marketing phrases.
   > `category` ∈ craft|motion|reduction|copy|components|imagery|verify|tutor — correct the
   > heuristic pre-fill when it is wrong. `needsUser` = true if the tool strictly requires user
   > interaction (login, selection, payment).
   Write results back into `inventory.json` with `enriched:true`, `categorySource:"agent"`.

3. **Start the picker:**
   `node ~/.claude/skills/auto-polish/scripts/picker.mjs --goal "<improvement brief>" --serve`
   (background task; `--lang de` for a German UI, `--port`/`--timeout` as needed). Then open
   `http://127.0.0.1:8848/` in the user's real browser and tell them in chat that they can deselect
   there. Everything is pre-selected — the default is deliberately "use all of it".
   *Remote / no local browser:* publish the same HTML as an artifact (only the copy-token channel
   works there, CSP blocks fetch).

4. **Take the selection** — three channels, all offered in the picker:
   - "Send to Claude" → `selection.json` (schema `auto-polish/selection@1`) — preferred.
   - "Copy selection" → the user pastes `AUTOPOLISH/1 goal="…" [showVariants] off=id,id`.
   - "Save JSON" → download, path mentioned in chat.
   If nothing arrives within 15 minutes, ask once in chat — never guess, never start without a
   selection.

5. **Bundle interaction needs:** clarify every selected tool with `needsUser:true` in ONE question
   before the workflow starts — after that the run goes through without further interruption.

---

## Phase 1 — 5x: parallel worlds using everything that remains

**Bundling:** cut the selected resources into **3–6 thematically coherent bundles** (3 for a single
component, 6 for a page or app), guided by the categories: structure/craft · motion/feel ·
reduction/anti-slop · components & system · assets/iconography · copy & wording.
**Every selected tool lands in exactly one bundle — none falls through the cracks.** A bundle whose
tools turn out to be unusable (CLI missing, MCP offline) is dropped and declared in the report.

**One builder per bundle** (`model: opus`, worktree isolation) builds a **real, runnable variant**:
- Mandatory reading in the prompt (absolute paths, the agent reads them itself):
  `~/.claude/skills/auto-polish/reference/design-basis.md` plus the 2–3 SKILL.md files of its
  bundle. An agent that does not quote applied skill rules in its output has FAILED its gate.
- The **improvement brief from the picker** is quoted verbatim in the prompt and is the assignment.
- Touch only the target files plus a throwaway harness. Functionality, handlers and positioning stay
  untouched, no new dependencies, project-wide token files (index.css) are off limits.
- Gates: build exit 0 · desktop screenshot 1280×800 · mobile screenshot 390×844 · if the stage
  contains animation, additionally a video (`recordVideo` → video-analysis MCP, fallback: a frame
  series). Static screenshots prove NOTHING about motion. A variant without evidence is out.
- Mandatory output line: `RESOURCES USED: <name → what for>`.

---

## Merge — the best of all worlds, without Frankenstein

1. **Judge panel** (`model: opus`) sees every variant screenshot plus diffs and scores each variant
   1–10 across layout · material/light · typography · motion · copy · responsive/a11y · originality.
2. **External tutors** (only those selected in the picker, **with images**, one round each):
   - `codex` → code craft, feasibility, detail quality.
   - `gemini` → visual impact, league comparison.
   Missing or failing CLI → skip and declare it in the report, never silently.
3. **Base choice:** the variant with the strongest **structure** (not the most decoration) becomes
   the base.
4. **Transplant table** (mandatory artifact, goes into the report):

   | Source | What | Why | Adopted / rejected |
   |---|---|---|---|

   A merge agent grafts the transplants into the base and makes each compatible with the base's
   material language. Whatever does not fit is **rejected with a reason** — not parked next to it.
5. If `showVariants` is set in the picker, show the user all variant screenshots before merging.
   Otherwise the run continues.

---

## Phase 2 — 10x: condensed onto the winners

No more fan-out. Continue only with the bundles that demonstrably won the merge (their transplants
were adopted). Same improvement brief, applied harder: an amplifier agent (`model: opus`) implements
the judge and tutor feedback in full, including copy fixes, and hunts for further levers on its own.
All phase 1 gates still apply.

Then **judge 2 (the minimalist):** "What has become too much? Would removing it make this stronger?"
Every ingredient must justify itself; kitsch, idle-state infinite loops and superfluous words go on
the removal list.

## Phase 3 — +3x: sweet-spot finish and strict acceptance

Final targeted jumps AND every rollback from the removal list — the end state is restrained and
refined, not maximally decorated. Then the strict overall acceptance: desktop · mobile · motion/video
· code review angle · both tutors again with images · empty/loading/error states walked through.

---

## Improvement gate (applies to each of the three stages)

The factors are not arithmetic — they are the same improvement brief sent through the system
repeatedly. The gate only prevents alibi rounds:

1. **Quota:** 5x = at least 5 different axes demonstrably lifted · 10x = at least 10 substantial
   interventions including at least one structural decision · +3x = 3 targeted jumps plus the full
   removal list.
2. **Blind comparison:** a judge sees only the before and after screenshot, without knowing which is
   new, and answers: "same league, or a different league?"

If a stage misses its gate, it gets **one** follow-up round. If it still misses, the shortfall is
stated openly in the report — never papered over, never silently continued.

---

## Polish report (mandatory output, always)

| Phase | Role | Roughly did | Skills/MCPs/CLIs used |
|---|---|---|---|

Plus: judge scores before/after · transplant table · the minimalist's removal list (what is
deliberately NOT in there) · gate result per stage · evidence list (build/screenshots/video/live) ·
**deselected and unused resources with a one-line reason each**. The report makes the run auditable
and tunable.

## Wrap-up (main session, not the workflow)

1. The workflow never commits or pushes — the main session reviews `final.png` (plus the video
   finding) ITSELF, diff-reviews against the rules, then commits per project doctrine.
2. **Live acceptance:** after deployment, open the live URL in a real browser and actually touch the
   polished area — passing locally is not done; the live proof belongs in the final answer.
3. Harness leftovers deleted (`git status` clean), screenshots in the scratch directory, picker
   server stopped.
4. Declare open points (e.g. iPhone/WebKit acceptance on mobile-critical projects).

## Files in this skill

- `scripts/scan-arsenal.mjs` — system scan → `inventory.json` (Node ≥18, dependency-free)
- `scripts/picker.mjs` — picker HTML + local return-channel server → `selection.json`
- `reference/design-basis.md` — mandatory reading for every agent
- `inventory.json` / `selection.json` / `picker.html` — runtime artifacts, not hand-maintained
