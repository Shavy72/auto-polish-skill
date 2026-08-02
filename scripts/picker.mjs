#!/usr/bin/env node
/**
 * auto-polish — arsenal picker (cross-platform, Node >=18, zero dependencies).
 *
 * Renders inventory.json into a self-contained HTML page where the user
 * deselects what should NOT be used in this run, and receives the selection
 * through a local HTTP endpoint.
 *
 * Called by: ~/.claude/skills/auto-polish/SKILL.md, phase 0 step 3.
 *
 * Return channels (all three offered in the picker):
 *   1. "Send to Claude" -> POST http://127.0.0.1:<port>/save -> selection.json
 *   2. "Copy selection" -> token to clipboard, user pastes it into the chat
 *   3. "Save JSON"      -> file download as a fallback
 *
 * Usage:
 *   node picker.mjs --goal "more modern and more premium" --serve [--lang de|en]
 *                   [--port 8848] [--timeout 900] [--inventory <path>]
 *                   [--out <path>] [--selection <path>]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const INVENTORY = resolve(opt('inventory', join(__dirname, '..', 'inventory.json')));
const OUT = resolve(opt('out', join(__dirname, '..', 'picker.html')));
const SELECTION = resolve(opt('selection', join(__dirname, '..', 'selection.json')));
const GOAL = opt('goal', '');
const PORT = Number(opt('port', '8848'));
const TIMEOUT = Number(opt('timeout', '900')) * 1000;
const LANG = opt('lang', 'de') === 'en' ? 'en' : 'de';
const SERVE = flag('serve');

if (!existsSync(INVENTORY)) {
  console.error(`No inventory found: ${INVENTORY} - run scan-arsenal.mjs first.`);
  process.exit(1);
}
const inv = JSON.parse(readFileSync(INVENTORY, 'utf8'));

// ---------------------------------------------------------------- i18n

const I18N = {
  de: {
    title: 'auto-polish — Design-Arsenal wählen',
    h1: 'Design-Arsenal für diesen Polish-Lauf',
    sub: 'Alles ist vorausgewählt — <b>abwählen</b>, was für diesen Auftrag nicht in Frage kommt. Phase 1 nutzt danach konsequent alles Verbliebene in parallelen Varianten; ab Phase 2 wird auf die Gewinner verdichtet.',
    goalLabel: '<b>Steigerungs-Wunsch</b> — dieser Satz geht in jeder Runde erneut durchs System:',
    goalPlaceholder: 'z.B. moderner und hochwertiger, ruhiger im Ruhezustand, Material statt Deko',
    search: 'Filtern nach Name oder Fähigkeit …',
    allOn: 'Alle an', allOff: 'Alle aus', theme: 'Theme', on: 'an', off: 'aus',
    specialty: 'Spezialisiert auf:',
    noDesc: 'Keine Beschreibung im Frontmatter hinterlegt.',
    needsUser: 'braucht dich im Loop',
    showVariants: 'Varianten vor dem Merge zeigen',
    send: 'An Claude senden', copy: 'Auswahl kopieren', save: 'JSON speichern',
    sending: 'sende …',
    sent: 'Übernommen — Claude läuft los. Fenster kann zu.',
    replied: 'Endpoint antwortete ',
    noEndpoint: 'Kein lokaler Empfänger erreichbar — nutze "Auswahl kopieren" und füge den Token im Chat ein.',
    copied: 'Kopiert — im Chat einfügen: ',
    clipBlocked: 'Zwischenablage blockiert. Manuell kopieren: ',
    saved: 'Gespeichert — Pfad im Chat nennen, falls Claude sie nicht findet.',
    activeA: '</b> von <b>', activeB: '</b> Tools aktiv',
    scan: ['Skills gescannt', 'davon design-relevant', 'MCP-Server', 'Plugins', 'KI-CLIs'],
    cats: {
      craft: ['Aufbau &amp; Craft', 'Layout, Material, Licht, Hierarchie — baut die Substanz auf.'],
      motion: ['Motion &amp; Feel', 'Bewegung, Übergänge, Mikro-Interaktionen, Haptik.'],
      reduction: ['Reduktion &amp; Anti-Slop', 'Streicht Kitsch, findet den Sweet Spot, erkennt KI-Tells.'],
      copy: ['Copy &amp; Wording', 'Buttons, Titel, Microcopy — Wortwahl und Verführungskraft.'],
      components: ['Komponenten &amp; System', 'Fertige Bausteine, Design-Tokens, Themes, Registries.'],
      imagery: ['Assets &amp; Ikonografie', 'Icons, Illustrationen, generierte Bilder statt Platzhalter.'],
      verify: ['Prüfen &amp; Beweisen', 'Browser, Screenshots, Viewports, Video, Messwerte.'],
      tutor: ['Externe KI-Tutoren', 'Unabhängige Zweitmeinung von außerhalb dieser Session.'],
    },
  },
  en: {
    title: 'auto-polish — pick your design arsenal',
    h1: 'Design arsenal for this polish run',
    sub: 'Everything is pre-selected — <b>deselect</b> whatever does not fit this job. Phase 1 then uses every remaining tool across parallel variants; from phase 2 on, the run narrows to the proven winners.',
    goalLabel: '<b>Improvement brief</b> — this sentence goes through the system again in every round:',
    goalPlaceholder: 'e.g. more modern and more premium, calmer at rest, material instead of decoration',
    search: 'Filter by name or capability …',
    allOn: 'All on', allOff: 'All off', theme: 'Theme', on: 'on', off: 'off',
    specialty: 'Specialised in:',
    noDesc: 'No description in the frontmatter.',
    needsUser: 'needs you in the loop',
    showVariants: 'Show variants before the merge',
    send: 'Send to Claude', copy: 'Copy selection', save: 'Save JSON',
    sending: 'sending …',
    sent: 'Received — Claude is starting. You can close this window.',
    replied: 'Endpoint replied ',
    noEndpoint: 'No local receiver reachable — use "Copy selection" and paste the token into the chat.',
    copied: 'Copied — paste into the chat: ',
    clipBlocked: 'Clipboard blocked. Copy manually: ',
    saved: 'Saved — mention the path in chat if Claude cannot find it.',
    activeA: '</b> of <b>', activeB: '</b> tools active',
    scan: ['skills scanned', 'design-relevant', 'MCP servers', 'plugins', 'AI CLIs'],
    cats: {
      craft: ['Structure &amp; craft', 'Layout, material, light, hierarchy — builds the substance.'],
      motion: ['Motion &amp; feel', 'Movement, transitions, micro-interactions, haptics.'],
      reduction: ['Reduction &amp; anti-slop', 'Cuts kitsch, finds the sweet spot, spots AI tells.'],
      copy: ['Copy &amp; wording', 'Buttons, titles, microcopy — word choice and pull.'],
      components: ['Components &amp; system', 'Ready-made blocks, design tokens, themes, registries.'],
      imagery: ['Assets &amp; iconography', 'Icons, illustrations, generated imagery instead of placeholders.'],
      verify: ['Verify &amp; prove', 'Browser, screenshots, viewports, video, measurements.'],
      tutor: ['External AI tutors', 'Independent second opinion from outside this session.'],
    },
  },
};
const T = I18N[LANG];

// ---------------------------------------------------------------- HTML

const payload = JSON.stringify({
  stats: inv.stats, goal: GOAL, port: PORT, lang: LANG,
  t: {
    specialty: T.specialty, noDesc: T.noDesc, needsUser: T.needsUser, on: T.on, off: T.off,
    sending: T.sending, sent: T.sent, replied: T.replied, noEndpoint: T.noEndpoint,
    copied: T.copied, clipBlocked: T.clipBlocked, saved: T.saved, scan: T.scan,
    activeA: T.activeA, activeB: T.activeB,
  },
  categories: T.cats,
  resources: inv.resources,
}).replace(/<\//g, '<\\/');

const html = `<title>${T.title}</title>
<style>
  :root {
    color-scheme: light dark;
    --bg:#f6f7f9; --panel:#fff; --ink:#14161a; --muted:#5c6472; --line:#e2e5ea;
    --accent:#3d5afe; --accent-ink:#fff; --warn:#b45309; --warn-bg:#fef3c7;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0e1014; --panel:#171a20; --ink:#eef0f4; --muted:#98a0ae; --line:#262b34;
            --accent:#7c8cff; --accent-ink:#0e1014; --warn:#fbbf24; --warn-bg:#3a2f10; }
  }
  :root[data-theme="dark"] { --bg:#0e1014; --panel:#171a20; --ink:#eef0f4; --muted:#98a0ae;
    --line:#262b34; --accent:#7c8cff; --accent-ink:#0e1014; --warn:#fbbf24; --warn-bg:#3a2f10; }
  :root[data-theme="light"] { --bg:#f6f7f9; --panel:#fff; --ink:#14161a; --muted:#5c6472;
    --line:#e2e5ea; --accent:#3d5afe; --accent-ink:#fff; --warn:#b45309; --warn-bg:#fef3c7; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.5 ui-sans-serif,system-ui,"Segoe UI",sans-serif; padding-bottom:120px; }
  .wrap { max-width:1080px; margin:0 auto; padding:28px 20px; }
  h1 { font-size:22px; margin:0 0 4px; letter-spacing:-.01em; }
  .sub { color:var(--muted); font-size:14px; margin:0 0 20px; }
  .scan { display:flex; flex-wrap:wrap; gap:8px; margin:0 0 18px; }
  .chip { background:var(--panel); border:1px solid var(--line); border-radius:999px; padding:5px 12px; font-size:13px; color:var(--muted); }
  .chip b { color:var(--ink); font-variant-numeric:tabular-nums; }
  .goal { width:100%; min-height:64px; resize:vertical; padding:11px 13px; border-radius:10px;
          border:1px solid var(--line); background:var(--panel); color:var(--ink); font:inherit; margin-bottom:8px; }
  .bar { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:12px 0 22px; }
  .search { flex:1 1 220px; padding:9px 12px; border-radius:10px; border:1px solid var(--line);
            background:var(--panel); color:var(--ink); font:inherit; }
  button { font:inherit; cursor:pointer; border-radius:9px; border:1px solid var(--line);
           background:var(--panel); color:var(--ink); padding:8px 13px; }
  button:hover { border-color:var(--accent); }
  button.primary { background:var(--accent); color:var(--accent-ink); border-color:var(--accent); font-weight:600; }
  section { margin-bottom:26px; }
  .head { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:10px; }
  .head h2 { font-size:15px; margin:0; letter-spacing:.02em; text-transform:uppercase; }
  .head .hint { color:var(--muted); font-size:13px; flex:1 1 200px; }
  .head button { padding:4px 9px; font-size:12px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:10px; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:12px 13px;
          display:flex; gap:11px; align-items:flex-start; transition:opacity .12s, border-color .12s; }
  .card.off { opacity:.42; }
  .card:focus-within { border-color:var(--accent); }
  .card input { margin:3px 0 0; width:17px; height:17px; accent-color:var(--accent); flex:0 0 auto; }
  .card .name { font-weight:600; display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
  .kind { font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--muted);
          border:1px solid var(--line); border-radius:5px; padding:1px 5px; }
  .spec { color:var(--muted); font-size:13.5px; margin-top:3px; }
  .spec b { color:var(--ink); font-weight:600; }
  .loop { display:inline-block; margin-top:6px; font-size:12px; color:var(--warn);
          background:var(--warn-bg); border-radius:6px; padding:2px 7px; }
  footer { position:fixed; left:0; right:0; bottom:0; background:var(--panel);
           border-top:1px solid var(--line); padding:12px 20px; }
  .fwrap { max-width:1080px; margin:0 auto; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  .count { color:var(--muted); font-size:13.5px; flex:1 1 190px; }
  .count b { color:var(--ink); font-variant-numeric:tabular-nums; }
  .opt { display:flex; align-items:center; gap:7px; font-size:13.5px; color:var(--muted); }
  .status { font-size:13px; color:var(--accent); min-height:19px; flex-basis:100%; }
</style>

<div class="wrap">
  <h1>${T.h1}</h1>
  <p class="sub">${T.sub}</p>
  <div class="scan" id="scan"></div>
  <label class="sub" for="goal">${T.goalLabel}</label>
  <textarea class="goal" id="goal" placeholder="${T.goalPlaceholder}"></textarea>
  <div class="bar">
    <input class="search" id="search" type="search" placeholder="${T.search}">
    <button id="all">${T.allOn}</button>
    <button id="none">${T.allOff}</button>
    <button id="theme">${T.theme}</button>
  </div>
  <div id="cats"></div>
</div>

<footer>
  <div class="fwrap">
    <div class="count" id="count"></div>
    <label class="opt"><input type="checkbox" id="showVariants"> ${T.showVariants}</label>
    <button class="primary" id="send">${T.send}</button>
    <button id="copy">${T.copy}</button>
    <button id="save">${T.save}</button>
    <div class="status" id="status"></div>
  </div>
</footer>

<script>
const DATA = ${payload};
const T = DATA.t;
const off = new Set();
const s = DATA.stats || {};
document.getElementById('scan').innerHTML =
  [s.skillsScanned, s.skillsRelevant, s.mcpServers, s.plugins, s.clis]
    .map((v, i) => v === undefined || v === null ? '' :
      '<span class="chip">' + T.scan[i] + ' <b>' + v + '</b></span>').join('');
document.getElementById('goal').value = DATA.goal || '';

const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const byCat = {};
DATA.resources.forEach(r => (byCat[r.category] = byCat[r.category] || []).push(r));

const cats = document.getElementById('cats');
['craft','motion','reduction','copy','components','imagery','verify','tutor']
  .filter(c => byCat[c]).forEach(c => {
    const [title, hint] = DATA.categories[c] || [c, ''];
    const sec = document.createElement('section');
    sec.innerHTML = '<div class="head"><h2>' + title + '</h2><span class="hint">' + hint +
      '</span><button data-on="1">' + T.on + '</button><button data-on="0">' + T.off + '</button></div>' +
      '<div class="grid">' + byCat[c].map(r => {
        const spec = r.specialty || r.rawSummary || T.noDesc;
        return '<label class="card" data-id="' + esc(r.id) + '" data-q="' + esc((r.name + ' ' + spec).toLowerCase()) + '">' +
          '<input type="checkbox" checked>' +
          '<div><div class="name">' + esc(r.name) + ' <span class="kind">' + esc(r.kind) + '</span></div>' +
          '<div class="spec"><b>' + T.specialty + '</b> ' + esc(spec) + '</div>' +
          (r.needsUser ? '<span class="loop">' + T.needsUser + '</span>' : '') +
          '</div></label>';
      }).join('') + '</div>';
    cats.appendChild(sec);
  });

const cards = [...document.querySelectorAll('.card')];
function sync() {
  cards.forEach(c => {
    const on = c.querySelector('input').checked;
    c.classList.toggle('off', !on);
    on ? off.delete(c.dataset.id) : off.add(c.dataset.id);
  });
  document.getElementById('count').innerHTML =
    '<b>' + (cards.length - off.size) + T.activeA + cards.length + T.activeB;
}
cats.addEventListener('change', sync);
cats.addEventListener('click', e => {
  const b = e.target.closest('button[data-on]'); if (!b) return;
  e.preventDefault();
  b.closest('section').querySelectorAll('.card input').forEach(i => i.checked = b.dataset.on === '1');
  sync();
});
document.getElementById('all').onclick = () => { cards.forEach(c => c.querySelector('input').checked = true); sync(); };
document.getElementById('none').onclick = () => { cards.forEach(c => c.querySelector('input').checked = false); sync(); };
document.getElementById('search').oninput = e => {
  const q = e.target.value.trim().toLowerCase();
  cards.forEach(c => c.style.display = !q || c.dataset.q.includes(q) ? '' : 'none');
};
document.getElementById('theme').onclick = () => {
  const cur = document.documentElement.dataset.theme;
  const dark = cur ? cur === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'light' : 'dark';
};

const selection = () => ({
  schema: 'auto-polish/selection@1',
  decidedAt: new Date().toISOString(),
  goal: document.getElementById('goal').value.trim(),
  showVariants: document.getElementById('showVariants').checked,
  off: [...off].sort(),
  on: cards.map(c => c.dataset.id).filter(id => !off.has(id)),
});
const token = () => {
  const sel = selection();
  return 'AUTOPOLISH/1 goal="' + sel.goal.replace(/"/g, "'") + '"'
       + (sel.showVariants ? ' showVariants' : '')
       + ' off=' + (sel.off.length ? sel.off.join(',') : '-');
};
const say = m => document.getElementById('status').textContent = m;

document.getElementById('copy').onclick = async () => {
  const t = token();
  try { await navigator.clipboard.writeText(t); say(T.copied + t); }
  catch { say(T.clipBlocked + t); }
};
document.getElementById('send').onclick = async () => {
  say(T.sending);
  try {
    const r = await fetch('http://127.0.0.1:' + DATA.port + '/save', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(selection()) });
    say(r.ok ? T.sent : T.replied + r.status);
  } catch { say(T.noEndpoint); }
};
document.getElementById('save').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(selection(), null, 2)], {type:'application/json'}));
  a.download = 'auto-polish-selection.json'; a.click();
  say(T.saved);
};
sync();
</script>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html, 'utf8');
console.log(`Picker written: ${OUT}`);

if (!SERVE) process.exit(0);

// ---------------------------------------------------------------- return channel

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }

  // Serving the page from the same origin keeps the return channel free of
  // CORS special cases and lets browser MCPs open it (file:// is blocked there).
  if (req.method === 'GET' && ['/', '/index.html', '/picker.html'].includes(req.url)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
    return;
  }

  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      writeFileSync(SELECTION, body, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}');
      console.log(`Selection received: ${SELECTION}`);
      clearTimeout(timer);
      server.close(() => process.exit(0));
    });
    return;
  }
  res.writeHead(404).end();
});

server.on('error', (e) => { console.error(`Port ${PORT} unusable: ${e.message}`); process.exit(1); });
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Waiting for selection (http://127.0.0.1:${PORT}/, timeout ${TIMEOUT / 1000}s) ...`);
});

const timer = setTimeout(() => {
  console.warn('Timeout - no selection received. Use the copy-token path.');
  server.close(() => process.exit(2));
}, TIMEOUT);
