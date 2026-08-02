# Design baseline — ALWAYS applies, even without installed skills

This catalog is mandatory reading for EVERY builder and judge agent of an auto-polish run
(put the absolute path into the agent prompt; the agent reads it itself). The skills and MCPs
the user selected stack on top — they never replace this baseline.

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

## Code review angle (judge short review)

reduced-motion guard · no emojis · transform/opacity only · timer cleanup · a11y labels.
