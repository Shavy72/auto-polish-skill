#!/usr/bin/env node
/**
 * auto-polish — arsenal scan (cross-platform, Node >=18, zero dependencies).
 *
 * Scans the local Claude setup for design-capable resources (skills, MCP
 * servers, plugins, external AI CLIs) and writes inventory.json.
 *
 * Called by: ~/.claude/skills/auto-polish/SKILL.md, phase 0 step 1.
 *
 * Cheap by design: reads only each skill's YAML frontmatter, never its body.
 * Already-enriched entries survive as long as the source file's mtime is
 * unchanged.
 *
 * Usage: node scan-arsenal.mjs [--force] [--out <path>] [--home <claude-dir>]
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir, hostname } from 'node:os';
import { delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const CLAUDE_HOME = resolve(opt('home', join(homedir(), '.claude')));
const INVENTORY = resolve(opt('out', join(__dirname, '..', 'inventory.json')));
const FORCE = flag('force');

const SKILLS_ROOT = join(CLAUDE_HOME, 'skills');
const PLUGINS_ROOT = join(CLAUDE_HOME, 'plugins');

// ---------------------------------------------------------------- Klassifikation

// Category -> regex over "name + description". 'craft' is deliberately the
// broadest rule and only acts as a fallback bucket (see categorize()).
const CATEGORY_RULES = {
  tutor: /codex|gemini|perplexity|second opinion|zweitmeinung|council|critique panel/,
  verify: /playwright|screenshot|viewport|browser|devtools|lighthouse|visual regression|responsive.?polish|design.?review|a11y|accessib|wcag|\bqa\b|testing|video.?analy/,
  reduction: /anti.?slop|minimal|reduc|declutter|brutalist|nothing|simplif|restraint/,
  motion: /motion|animat|transition|easing|micro.?interaction|scroll.?effect|parallax/,
  copy: /copywrit|copy.?edit|microcopy|wording|headline|tonalit|humaniz|content.?strateg/,
  components: /shadcn|component librar|design.?system|design.?token|theme|brand.?kit|brand.?guideline|figma|stitch|registry|blocks/,
  imagery: /image|icon|svg|illustration|photo|texture|logo|asset generation|replicate|flux|\bfal\b/,
  craft: /design|\bui\b|\bux\b|frontend|interface|layout|typograph|visual|\bcss\b|tailwind|aesthetic|styling|landing.?page|dashboard|polish|redesign/,
};

const STRONG = /design|\bui\b|\bux\b|frontend|interface|typograph|layout|visual|\bcss\b|tailwind|aesthetic|animation|motion|design.?system|component|landing.?page|redesign|polish/;
const WEAK = /screenshot|viewport|responsive|colou?r|spacing|\bicon|theme|brand|microcopy|hierarchy|whitespace|shadow|gradient|font/;

// Domains that happen to carry design words but never polish a web/app UI.
const EXCLUDE = new RegExp([
  'n8n|instagram|onlyfans|\\bof-|reel\\b|proxy|\\bcrm\\b|invoice|airtable|weather|token|\\bgit\\b|commit|pull request|changelog|\\bseo\\b|cold.?email|newsletter|sales|pricing|churn|\\blead\\b|paid.?ads',
  'desktop|windows|android|\\badb\\b|pyautogui|terminal|shell|keyboard|mouse|office.?hours|pptx|xlsx|docx|\\bpdf\\b|presentation|slide',
  'mcp.?builder|debug|retro|premortem|planning|plan-|ab.?test|a/b|session|handoff|context.?save|context.?restore|worktree|deploy|docker|weaviate|mlflow',
].join('|'));

const CORE = /^ds-|impeccable|design|ui-|ux-|-ui$|-ux$|motion|animation|polish|slop|minimal|brutalist|typo|shadcn|theme|brand/;

const count = (s, re) => (s.match(new RegExp(re.source, 'g')) || []).length;
const isDir = (p) => { try { return statSync(p).isDirectory(); } catch { return false; } };

function relevance(hay) {
  let score = count(hay, STRONG) * 3 + count(hay, WEAK);
  if (EXCLUDE.test(hay)) score -= 8;
  return score;
}

function categorize(hay) {
  let best = null, bestN = 0;
  for (const [cat, re] of Object.entries(CATEGORY_RULES)) {
    if (cat === 'craft') continue;
    const n = count(hay, re);
    if (n > bestN) { bestN = n; best = cat; }
  }
  if (best) return best;
  return count(hay, CATEGORY_RULES.craft) ? 'craft' : null;
}

/** Reads name/description from the YAML frontmatter without a YAML parser. */
function readFrontmatter(file) {
  let head;
  try { head = readFileSync(file, 'utf8').split(/\r?\n/).slice(0, 60); } catch { return null; }
  if (!head.length || !/^---\s*$/.test(head[0])) return null;
  let name = null, desc = null, inDesc = false;
  for (let i = 1; i < head.length; i++) {
    const line = head[i];
    if (/^---\s*$/.test(line)) break;
    let m;
    if ((m = line.match(/^name:\s*(.+)$/))) { name = m[1].trim().replace(/^["']|["']$/g, ''); inDesc = false; continue; }
    if ((m = line.match(/^description:\s*(.*)$/))) { desc = m[1].trim().replace(/^["']|["']$/g, ''); inDesc = true; continue; }
    if (inDesc) {
      if (/^\S+:/.test(line)) { inDesc = false; continue; }
      desc = `${desc} ${line.trim().replace(/^["']|["']$/g, '')}`.trim();
    }
  }
  return desc ? { name, description: desc } : null;
}

// ---------------------------------------------------------------- Cache

const cache = new Map();
if (!FORCE && existsSync(INVENTORY)) {
  try {
    for (const r of JSON.parse(readFileSync(INVENTORY, 'utf8')).resources ?? []) cache.set(r.id, r);
  } catch { console.warn('Existing inventory.json unreadable - rebuilding from scratch.'); }
}

const resources = [];
const stats = { skillsScanned: 0, skillsRelevant: 0, mcpServers: 0, plugins: 0, clis: 0, reused: 0 };

// ---------------------------------------------------------------- Skills

if (existsSync(SKILLS_ROOT)) {
  for (const entry of readdirSync(SKILLS_ROOT, { withFileTypes: true })) {
    // isDirectory() is false for symlinks/junctions - statSync follows the
    // link. Without this, linked skills silently vanish from the picker.
    if (!isDir(join(SKILLS_ROOT, entry.name))) continue;
    const md = join(SKILLS_ROOT, entry.name, 'SKILL.md');
    if (!existsSync(md)) continue;
    stats.skillsScanned++;
    if (entry.name === 'auto-polish') continue;

    const fm = readFrontmatter(md);
    if (!fm) continue;

    const hay = `${entry.name} ${fm.description}`.toLowerCase();
    const isCore = CORE.test(entry.name);
    const score = relevance(hay);
    if (score < 0) continue;
    if (score < 6 && !isCore) continue;

    const category = categorize(hay);
    if (!category) continue;

    stats.skillsRelevant++;
    const id = `skill:${entry.name}`;
    const mtime = statSync(md).mtime.toISOString();
    const prev = cache.get(id);
    if (prev && prev.mtime === mtime && prev.enriched) { stats.reused++; resources.push(prev); continue; }

    resources.push({
      id, kind: 'skill', name: entry.name, category, path: md, mtime,
      rawSummary: fm.description, categorySource: 'heuristic',
      specialty: null, bestFor: [], needsUser: false, enriched: false,
    });
  }
}

// ---------------------------------------------------------------- MCP-Server

const MCP_META = {
  '21st': ['components', 'Searches and generates production-ready React/Tailwind components from a curated catalogue; returns variants, logos and inspiration references.', false],
  shadcn: ['components', 'Searches shadcn registries for building blocks, shows example code and provides audit checklists for correct integration.', false],
  stitch: ['components', 'Generates whole screens and design systems from text, produces variants and exports assets.', true],
  'chrome-devtools': ['verify', 'Measures real page quality: Lighthouse audit, performance trace, console/network, viewport emulation, screenshots.', false],
  'claude-in-chrome': ['verify', 'Drives the real Chrome including existing logins - click walkthroughs, screenshots, GIF recordings of actual flows.', false],
  'claude-video-vision': ['verify', 'Analyses recorded animation videos - judges timing, jank and motion semantics, which screenshots cannot show.', false],
  replicate: ['imagery', 'Runs image/video models (generation, upscaling, background removal) for bespoke assets instead of stock placeholders.', false],
  firecrawl: ['tutor', 'Pulls real reference designs from the web as a concrete benchmark instead of vague adjectives.', false],
  perplexity: ['tutor', 'Web-grounded second opinion on current design conventions and reference classes.', false],
  'video-research': ['tutor', 'Gemini analysis of screenshots, videos and reference material as an independent visual second opinion.', false],
};

const mcpNames = new Set();
for (const cfg of [join(homedir(), '.claude.json'), join(CLAUDE_HOME, 'settings.json')]) {
  if (!existsSync(cfg)) continue;
  try {
    const parsed = JSON.parse(readFileSync(cfg, 'utf8'));
    for (const k of Object.keys(parsed.mcpServers ?? {})) mcpNames.add(k);
  } catch { console.warn(`MCP config ${cfg} not parseable.`); }
}

for (const name of mcpNames) {
  const meta = MCP_META[name];
  let category, specialty, needsUser;
  if (meta) { [category, specialty, needsUser] = meta; }
  else {
    category = categorize(name.toLowerCase());
    if (!category) continue;
    specialty = null; needsUser = false;
  }
  stats.mcpServers++;
  const id = `mcp:${name}`;
  const prev = cache.get(id);
  if (prev && prev.enriched) { stats.reused++; resources.push(prev); continue; }
  resources.push({
    id, kind: 'mcp', name, category, path: null, mtime: null,
    rawSummary: specialty, categorySource: meta ? 'curated' : 'heuristic',
    specialty, bestFor: [], needsUser, enriched: Boolean(specialty),
  });
}

// ---------------------------------------------------------------- Plugins

if (existsSync(PLUGINS_ROOT)) {
  for (const entry of readdirSync(PLUGINS_ROOT, { withFileTypes: true })) {
    if (['cache', 'repos', 'marketplaces'].includes(entry.name)) continue;
    const dir = join(PLUGINS_ROOT, entry.name);
    if (!isDir(dir)) continue;
    let desc = null;
    for (const f of readdirSync(dir).filter((f) => /plugin|manifest/.test(f) && f.endsWith('.json'))) {
      try { desc = JSON.parse(readFileSync(join(dir, f), 'utf8')).description ?? null; } catch {}
      if (desc) break;
    }
    const hay = `${entry.name} ${desc ?? ''}`.toLowerCase();
    const category = categorize(hay);
    if (!category || relevance(hay) < 0) continue;
    stats.plugins++;
    const id = `plugin:${entry.name}`;
    const prev = cache.get(id);
    if (prev && prev.enriched) { stats.reused++; resources.push(prev); continue; }
    resources.push({
      id, kind: 'plugin', name: entry.name, category, path: dir, mtime: null,
      rawSummary: desc, categorySource: 'heuristic',
      specialty: null, bestFor: [], needsUser: false, enriched: false,
    });
  }
}

// ---------------------------------------------------------------- Externe CLIs

const CLI_META = {
  codex: 'External AI tutor (OpenAI Codex CLI): judges code craft, feasibility and detail quality from file + screenshot.',
  gemini: 'External AI tutor (Google Gemini CLI): judges visual impact and league comparison from screenshots.',
};
const PATH_DIRS = (process.env.PATH ?? '').split(delimiter).filter(Boolean);
const PATHEXT = (process.env.PATHEXT ?? '').split(';').filter(Boolean);

function whichSync(cmd) {
  for (const dir of PATH_DIRS) {
    const candidates = process.platform === 'win32'
      ? [cmd, ...PATHEXT.map((e) => cmd + e.toLowerCase()), ...PATHEXT.map((e) => cmd + e)]
      : [cmd];
    for (const c of candidates) {
      try { if (statSync(join(dir, c)).isFile()) return join(dir, c); } catch {}
    }
  }
  return null;
}

for (const [cli, specialty] of Object.entries(CLI_META)) {
  const p = whichSync(cli);
  if (!p) continue;
  stats.clis++;
  resources.push({
    id: `cli:${cli}`, kind: 'cli', name: cli, category: 'tutor', path: p, mtime: null,
    rawSummary: specialty, categorySource: 'curated', specialty, bestFor: [], needsUser: false, enriched: true,
  });
}

// ---------------------------------------------------------------- Schreiben

resources.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
mkdirSync(dirname(INVENTORY), { recursive: true });
writeFileSync(INVENTORY, JSON.stringify({
  schema: 'auto-polish/inventory@1',
  generatedAt: new Date().toISOString(),
  host: hostname(),
  stats,
  resources,
}, null, 2), 'utf8');

const pending = resources.filter((r) => !r.enriched).length;
console.log(`Inventory written: ${INVENTORY}`);
console.log(`skills scanned: ${stats.skillsScanned} | design-relevant: ${stats.skillsRelevant} | MCPs: ${stats.mcpServers} | plugins: ${stats.plugins} | CLIs: ${stats.clis} | from cache: ${stats.reused}`);
console.log(`Pending enrichment (specialty missing): ${pending}`);
