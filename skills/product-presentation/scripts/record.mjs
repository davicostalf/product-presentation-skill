#!/usr/bin/env node
// record.mjs - record a scripted Playwright scenario as REAL screen video.
//
// Starts a virtual display (Xvfb), a headed Chromium on it (so pages render, animate and
// load exactly as for a person), the injected pointer overlay (cursor.js), and ffmpeg
// grabbing the display. The scenario drives the page; what you get is a continuous video of
// the live interaction: typing, clicks, scrolls, transitions, loading states.
//
// Dependencies: Node 18+, `playwright` (npm), a Chromium binary (npx playwright install
// chromium, or CHROME_PATH), Xvfb, ffmpeg with x11grab + libx264. Run check_env.sh first.
//
// Usage:
//   node record.mjs --scenario scenario.mjs --url https://localhost:3000/ --mode desktop --out desktop.mkv
//   node record.mjs --scenario scenario.mjs --url https://localhost:3000/ --mode phone   --out phone.mkv
//
// Desktop and phone IN PARALLEL on the same clock: use run_pair.sh (two displays, two
// browsers, two ffmpeg processes, started together), or start the two commands yourself
// with different --display and --port values and `&` / wait.
//
// Options:
//   --scenario FILE   module exporting `run(ctx)` and optionally `setup(ctx)` (required)
//   --url URL         page to open; passed to the scenario as ctx.url (setup() opens it)
//   --mode MODE       desktop | phone (default desktop)
//   --out FILE        output video (default <mode>.mkv). mkv survives an abrupt stop.
//   --cues FILE       JSON cue list (key -> seconds), passed as ctx.cues
//   --width/--height  desktop: viewport in CSS px (default 1440x900)
//                     phone: size of the host WINDOW in CSS px (default: device + 40 px margin
//                     each side, at least 500 wide, the Chromium minimum); rarely needed
//   --device WxH      phone only: the prototype's screen in CSS px (default 390x844)
//   --scale N         device scale factor (desktop 1.5 -> 2160x1350, phone 2 -> 780x1688 clip)
//   --safe-top N      phone only: top safe-area inset, CSS px (default 47, the status area)
//   --safe-bottom N   phone only: bottom safe-area inset (default 34, the home indicator)
//   --safe-radius N   phone only: screen corner radius at 390 px width (default 44; scales with
//                     the device width). compose.py rounds the screen with the same radius
//   --no-status-bar   phone only: do not draw the fake status bar and home indicator
//   --no-safe-check   phone only: skip the safe-area check (see below)
//   --display N       X display number (default 90 desktop, 91 phone)
//   --port N          Chromium remote-debugging port (default 9390 desktop, 9391 phone)
//   --fps N           capture frame rate (default 30)
//   --crf N           x264 quality of the raw capture (default 12; near-lossless)
//   --lead S          seconds of marker (solid red) before scenario time 0 (default 1.2)
//   --hold S          seconds kept recording after run() returns (default 0.7)
//   --no-cursor       do not draw the pointer (slides and other non-interactive pages only)
//   --keep-ui         keep the pointer overlay's scrollbar/focus-ring/tooltip cleanup off
//   --hide SELECTORS  CSS selectors hidden in every frame during capture: the prototype's own tools
//                     (a control panel, a debug button), e.g. --hide '[data-corner], .pc-root'
//
// Scenario contract (see scenario-example.mjs):
//   export async function setup(ctx) { await ctx.open(ctx.url); ... }        // not recorded
//   export async function run(ctx)   { await ctx.at(ctx.cues.start); ... }   // recorded, t=0 at start
// ctx = { page, app, frame, open(url), pointer, cues, mode, url, vw, vh, device, sleep,
//         at(t), now(), mark(name), checkSafeArea(label), log }
//   app     what the scenario drives: the Page on desktop, a FrameLocator on the phone. Always use
//           app.locator(...), app.getByRole(...) etc. so one scenario works for both modes
//   open(u) opens the prototype: page.goto on desktop, loads it into the phone iframe
//   frame   the Playwright Frame holding the prototype (the main frame on desktop)
//   page    desktop: the prototype page. Phone: the HOST page (use it for the mouse and keyboard,
//           not for locating prototype elements; pointer.* already handles that)
//   device  phone only: the iframe rect in host CSS px { x, y, w, h, safe: {top, bottom, radius} }
//   at(t)   waits until scenario time t seconds; records LATE if the scenario is already behind
//   mark(n) logs an event with its scenario time (written to <out>.json); on the phone it also
//           runs the safe-area check
//
// Phone capture: the prototype runs inside an iframe of exactly --device CSS px (390x844)
// embedded in a host page, centered on a flat background, in a window of at least 500 px (the
// Chromium minimum). The prototype therefore lays out at a real phone width. ffmpeg grabs only
// the iframe rect, in screen pixels, so the clip is exactly device x scale (780x1688 at 2).
// The host page tells the prototype its safe areas through CSS custom properties on its root
// element (--safe-area-inset-top/-bottom/-left/-right, --safe-area-corner-radius, in px) and
// through the browser's safe-area emulation when available, so env(safe-area-inset-*) works as
// well. A fake status bar and home indicator are drawn in the insets. The prototype must be
// framable (no X-Frame-Options / frame-ancestors that block the host).
//
// Safe-area check (phone): the elements with an interactive role (links, buttons, inputs,
// role=button/tab/..., onclick, focusable) that are visible and whose box touches a rounded
// corner zone, the top inset band or the bottom inset band are reported as events named
// SAFE-AREA (zone, element, rect, fixed) in <out>.json and as warnings on stderr. It runs
// after setup (page at rest) and at every mark(); call ctx.checkSafeArea(label) for more.
// Scrolling content passes through the bands while it moves: judge those at resting points.
//
// Time zero: a red marker covers the page while ffmpeg starts, then disappears. compose.py
// finds the first non-red frame and cuts both clips there, so desktop and phone share t=0.
//
// The 'Chrome for Testing' banner is removed with --test-type --disable-infobars. The window
// is fullscreen (--kiosk) on a display exactly the size of the capture, so the video is the
// page and nothing else. Chromium refuses windows narrower than 500 CSS px, which is why the
// phone prototype is not the window itself but an iframe inside it (see Phone capture).

import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import cursor from './cursor.js';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fail = (msg, code = 2) => { console.error('record.mjs: ' + msg); process.exit(code); };

// ---- arguments -------------------------------------------------------------
const argv = process.argv.slice(2);
const flags = new Set(['--no-cursor', '--keep-ui', '--no-status-bar', '--no-safe-check', '--help']);
const opt = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) fail('unexpected argument ' + a);
  if (flags.has(a)) opt[a.slice(2)] = true;
  else { opt[a.slice(2)] = argv[++i]; if (opt[a.slice(2)] === undefined) fail('missing value for ' + a); }
}
if (opt.help || !opt.scenario) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).slice(0, 100).map((l) => l.slice(3)).join('\n'));
  process.exit(opt.help ? 0 : 2);
}
const mode = opt.mode || 'desktop';
if (!['desktop', 'phone'].includes(mode)) fail('--mode must be desktop or phone');
const phone = mode === 'phone';
const dsf = +(opt.scale || (phone ? 2 : 1.5));
const [fw, fh] = (opt.device || '390x844').split('x').map(Number);
if (!(fw > 0 && fh > 0)) fail('--device must look like 390x844');
const safe = {
  top: +(opt['safe-top'] ?? 47), bottom: +(opt['safe-bottom'] ?? 34),
  radius: +(opt['safe-radius'] ?? 44) * fw / 390,
};
const even = (n, ref) => ((n - ref) % 2 ? n + 1 : n);       // keep the device centered on whole px
const vw = phone ? even(+(opt.width || Math.max(500, fw + 80)), fw) : +(opt.width || 1440);
const vh = phone ? even(+(opt.height || fh + 80), fh) : +(opt.height || 900);
if (phone && (vw < fw || vh < fh)) fail(`window ${vw}x${vh} is smaller than the device ${fw}x${fh}`);
const dev = { x: (vw - fw) / 2, y: (vh - fh) / 2, w: fw, h: fh, safe };   // iframe rect, host CSS px
const display = +(opt.display || (phone ? 91 : 90));
const port = +(opt.port || (phone ? 9391 : 9390));
const fps = +(opt.fps || 30);
const crf = String(opt.crf || 12);
const lead = +(opt.lead || 1.2);
const hold = +(opt.hold || 0.7);
const out = resolve(opt.out || `${mode}.mkv`);
const W = Math.ceil(vw * dsf), H = Math.ceil(vh * dsf);                     // display (window) in px
const ev = (n) => Math.ceil(n / 2) * 2;                                     // yuv420p needs even sizes
// What ffmpeg records: the whole display on desktop, exactly the iframe rect on the phone.
const cap = phone
  ? { x: Math.round(dev.x * dsf), y: Math.round(dev.y * dsf), w: ev(Math.round(fw * dsf)), h: ev(Math.round(fh * dsf)) }
  : { x: 0, y: 0, w: W, h: H };
if (phone && vw < 500) console.warn('record.mjs: warning: Chromium windows are at least 500 CSS px wide; --width ' + vw + ' will be widened.');
if (phone && (cap.x + cap.w > W || cap.y + cap.h > H)) fail('capture rect falls outside the display');

// ---- environment checks (fail loudly, never fall back to stills) ----------
const have = (c) => { try { execSync(`command -v ${c}`, { stdio: 'ignore' }); return true; } catch { return false; } };
if (!have('Xvfb')) fail('Xvfb not found. Install it (apt-get install -y xvfb). Real capture is impossible without a virtual display; do NOT substitute screenshots.', 3);
if (!have('ffmpeg')) fail('ffmpeg not found. Install it (apt-get install -y ffmpeg).', 3);

function loadPlaywright() {
  for (const name of ['playwright', 'playwright-core']) {
    try { return require(name); } catch { /* try next */ }
  }
  try {
    const root = execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    for (const name of ['playwright', 'playwright-core']) {
      try { return require(join(root, name)); } catch { /* try next */ }
    }
  } catch { /* no npm */ }
  fail('Playwright is not installed. Run: npm install playwright && npx playwright install chromium', 3);
}
const playwright = loadPlaywright();
const chromePath = process.env.CHROME_PATH || playwright.chromium.executablePath();
if (!existsSync(chromePath)) fail(`Chromium binary not found at ${chromePath}. Run: npx playwright install chromium (or set CHROME_PATH).`, 3);

// ---- processes -------------------------------------------------------------
const procs = [];
let profile = null;
async function cleanup() {
  for (const p of procs.reverse()) { try { p.kill('SIGTERM'); } catch { /* gone */ } }
  await sleep(300);
  for (const p of procs) { try { p.kill('SIGKILL'); } catch { /* gone */ } }
  if (profile) { try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ } }
  try { rmSync(hostFile, { force: true }); } catch { /* ignore */ }
  for (const f of [`/tmp/.X${display}-lock`, `/tmp/.X11-unix/X${display}`]) { try { rmSync(f, { force: true }); } catch { /* ignore */ } }
}
process.on('SIGINT', async () => { await cleanup(); process.exit(130); });

// A stale lock from a killed Xvfb blocks the display number: remove it only when its owner is dead.
const lock = `/tmp/.X${display}-lock`;
if (existsSync(lock)) {
  const pid = parseInt(readFileSync(lock, 'utf8'), 10);
  let alive = false;
  try { process.kill(pid, 0); alive = true; } catch { /* dead */ }
  if (alive) fail(`display :${display} is in use by pid ${pid}. Pick another with --display.`);
  rmSync(lock, { force: true }); rmSync(`/tmp/.X11-unix/X${display}`, { force: true });
}

const xvfb = spawn('Xvfb', [`:${display}`, '-screen', '0', `${W}x${H}x24`, '-nolisten', 'tcp'], { stdio: 'ignore' });
procs.push(xvfb);
let xvfbExited = false; xvfb.on('exit', () => { xvfbExited = true; });
await sleep(1200);
if (xvfbExited) { await cleanup(); fail(`Xvfb :${display} exited at start (display busy or no permission). Try another --display.`, 3); }

profile = mkdtempSync(join(tmpdir(), 'rec-profile-'));
writeFileSync(join(profile, 'Local State'), '{}');
// Phone host page: a flat background with the prototype's iframe at exactly fw x fh CSS px,
// centered, plus an optional fake status bar and home indicator drawn inside the safe insets.
function hostPage() {
  const bar = opt['no-status-bar'] ? '' : `
<div class="sb"><span>9:41</span><span class="ic"><i class="sig"></i><i class="wifi"></i><i class="bat"></i></span></div>
<div class="hi"></div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>host</title><style>
html,body{margin:0;height:100%;overflow:hidden;background:#F2F3F5}
iframe{position:absolute;left:${dev.x}px;top:${dev.y}px;width:${fw}px;height:${fh}px;border:0;background:#fff;display:block}
.sb,.hi{position:absolute;pointer-events:none;z-index:2}
.sb{left:${dev.x}px;top:${dev.y}px;width:${fw}px;height:${safe.top}px;box-sizing:border-box;padding:${Math.round(safe.top * 0.3)}px ${Math.round(fw * 0.07)}px 0;
 display:flex;justify-content:space-between;align-items:flex-start;font:600 15px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#111}
.ic{display:flex;gap:6px;align-items:center;height:15px}
.ic i{display:block;background:#111}
.sig{width:17px;height:11px;clip-path:polygon(0 100%,0 70%,25% 70%,25% 100%,33% 100%,33% 45%,58% 45%,58% 100%,66% 100%,66% 20%,100% 20%,100% 100%)}
.wifi{width:15px;height:11px;clip-path:polygon(50% 100%,0 35%,15% 20%,50% 60%,85% 20%,100% 35%)}
.bat{width:25px;height:12px;border-radius:3.5px;background:transparent!important;border:1.5px solid rgba(17,17,17,.55);position:relative}
.bat:after{content:"";position:absolute;inset:1.5px;border-radius:1.5px;background:#111}
.hi{left:${dev.x + (fw - 134) / 2}px;top:${dev.y + fh - Math.round(safe.bottom * 0.4) - 5}px;width:134px;height:5px;border-radius:3px;background:#111;opacity:.85}
</style></head><body><iframe name="device" aria-label="prototype"></iframe>${bar}</body></html>`;
}
const hostFile = join(tmpdir(), `rec-host-${process.pid}.html`);
if (phone) writeFileSync(hostFile, hostPage());

const chrome = spawn(chromePath, [
  '--no-sandbox', '--no-first-run', '--no-default-browser-check', '--password-store=basic',
  '--kiosk', '--test-type', '--disable-infobars', '--hide-scrollbars',
  '--disable-features=Translate,TranslateUI,InfiniteSessionRestore', '--disable-translate',
  '--disable-component-update', '--lang=en-US',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--autoplay-policy=no-user-gesture-required',
  `--window-position=0,0`, `--window-size=${vw},${vh}`, `--force-device-scale-factor=${dsf}`,
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
], { env: { ...process.env, DISPLAY: ':' + display }, stdio: 'ignore' });
procs.push(chrome);

let browser;
for (let i = 0; i < 60 && !browser; i++) {
  try { browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:' + port); } catch { await sleep(250); }
}
if (!browser) { await cleanup(); fail(`could not connect to Chromium on port ${port}. Is the port in use? Try another --port.`, 3); }

let ff = null;
const events = [];
const errors = [];
let exitCode = 0;
try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] || await ctx.newPage();
  page.on('pageerror', (e) => errors.push('PAGEERR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  if (phone) {
    // Phones get a mobile user agent; layout still follows the viewport width.
    const s = await ctx.newCDPSession(page);
    await s.send('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
    });
    // Safe areas for env(safe-area-inset-*): works where the browser supports the override.
    await s.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: safe.top, bottom: safe.bottom, left: 0, right: 0 } })
      .catch((e) => console.warn('record.mjs: note: env(safe-area-inset-*) emulation unavailable (' + e.message + '); the --safe-area-* CSS variables are still set'));
    // Safe areas as CSS custom properties on the prototype's root element (every iframe, same-origin or not).
    await ctx.addInitScript((sa) => {
      if (window.self === window.top) return;
      const css = ':root{--safe-area-inset-top:' + sa.top + 'px;--safe-area-inset-bottom:' + sa.bottom +
        'px;--safe-area-inset-left:0px;--safe-area-inset-right:0px;--safe-area-corner-radius:' + sa.radius + 'px}';
      const put = () => {
        if (!document.documentElement) return false;
        const st = document.createElement('style'); st.id = '__safe_area_vars'; st.textContent = css;
        document.documentElement.appendChild(st); return true;
      };
      if (!put()) { const mo = new MutationObserver(() => { if (put()) mo.disconnect(); }); mo.observe(document, { childList: true }); }
    }, { top: safe.top, bottom: safe.bottom, radius: +safe.radius.toFixed(2) });
  }

  // The prototype's own tools (a state panel, a debug button) are not part of what is presented.
  if (opt.hide) {
    await ctx.addInitScript((sel) => {
      const put = () => {
        if (!document.documentElement) return false;
        const st = document.createElement('style'); st.id = '__capture_hide';
        st.textContent = sel + '{display:none!important}';
        document.documentElement.appendChild(st); return true;
      };
      if (!put()) { const mo = new MutationObserver(() => { if (put()) mo.disconnect(); }); mo.observe(document, { childList: true }); }
    }, opt.hide);
  }
  // Phone: a touch screen has no hover. Drop every :hover rule from the prototype's stylesheets, now and as
  // new ones load, so a tap never leaves a hover highlight behind (only :active shows).
  if (phone) {
    await ctx.addInitScript(() => {
      if (window.self === window.top) return;
      const strip = () => {
        for (const sheet of Array.from(document.styleSheets)) {
          let rules; try { rules = sheet.cssRules; } catch { continue; }
          const walk = (list, owner) => {
            for (let i = list.length - 1; i >= 0; i--) {
              const rule = list[i];
              if (rule.selectorText && rule.selectorText.includes(':hover')) owner.deleteRule(i);
              else if (rule.cssRules) walk(rule.cssRules, rule);
            }
          };
          walk(rules, sheet);
        }
      };
      // Stylesheets land in <head> (dev servers inject <style> tags as modules load): watch only that.
      const start = () => { strip(); new MutationObserver(strip).observe(document.head || document.documentElement, { childList: true }); window.addEventListener('load', strip); };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
    });
  }

  const useCursor = !opt['no-cursor'];
  // Phone: the host page has no pointer of its own; the dot is drawn inside the prototype's iframe.
  if (useCursor) await cursor.install(ctx, { mode: phone ? 'phone' : 'desktop', clean: !opt['keep-ui'], where: phone ? 'frames' : 'top' });
  if (phone) await page.goto(pathToFileURL(hostFile).href);
  // Resting area of the pointer: on the phone, inside the screen with dot radius (18) + 8 px of margin
  // from every edge, the rounded corners (radius + margin) and the top/bottom safe-area bands.
  const pm = 26;
  const bounds = phone ? {
    left: dev.x + pm, right: dev.x + dev.w - pm,
    top: dev.y + Math.max(safe.top, safe.radius) + pm, bottom: dev.y + dev.h - Math.max(safe.bottom, 0) - pm,
  } : null;
  const pointer = await cursor.attach(page, { mode: phone ? 'phone' : 'desktop', bounds });
  const appFrame = () => (phone ? page.frame({ name: 'device' }) : page.mainFrame());
  if (phone) {
    // A navigation inside the iframe creates a fresh overlay off-screen: re-emit the pointer position.
    page.on('framenavigated', (f) => { if (f !== page.mainFrame()) setTimeout(() => pointer.reveal().catch(() => {}), 250); });
  }

  const cues = opt.cues ? JSON.parse(readFileSync(opt.cues, 'utf8')) : {};
  const sc = await import(pathToFileURL(resolve(opt.scenario)).href);
  if (typeof sc.run !== 'function') throw new Error('scenario must export an async run(ctx)');

  // ---- safe-area check (phone) ----
  const seen = new Set();
  const checkSafeArea = async (label = '') => {
    if (!phone || opt['no-safe-check']) return [];
    const frame = appFrame();
    if (!frame) return [];
    const found = await frame.evaluate((sa) => {
      const W = innerWidth, H = innerHeight, R = sa.radius;
      const sel = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],' +
        '[role=checkbox],[role=radio],[role=switch],[role=menuitem],[role=option],[role=textbox],[role=searchbox],' +
        '[role=combobox],[role=slider],[onclick],[tabindex]:not([tabindex="-1"])';
      const name = (e) => {
        const t = (e.getAttribute('aria-label') || e.innerText || e.value || e.placeholder || '').trim().replace(/\s+/g, ' ').slice(0, 30);
        return e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.getAttribute('role') ? '[role=' + e.getAttribute('role') + ']' : '') + (t ? ' "' + t + '"' : '');
      };
      const persistent = (e) => { for (let n = e; n && n !== document.body; n = n.parentElement) { const p = getComputedStyle(n).position; if (p === 'fixed' || p === 'sticky') return true; } return false; };
      // A box is cut by a rounded corner when its point nearest to the corner lies outside the arc.
      const cut = (r, cx, cy, sx, sy) => {   // corner (cx, cy); sx, sy = direction into the screen
        const x0 = Math.max(r.left, sx > 0 ? 0 : W - R), x1 = Math.min(r.right, sx > 0 ? R : W);
        const y0 = Math.max(r.top, sy > 0 ? 0 : H - R), y1 = Math.min(r.bottom, sy > 0 ? R : H);
        if (x0 >= x1 || y0 >= y1) return false;               // box does not reach the corner square
        const px = sx > 0 ? x0 : x1, py = sy > 0 ? y0 : y1;   // its point nearest to the corner
        return Math.hypot(px - (cx + sx * R), py - (cy + sy * R)) > R;
      };
      const out = [];
      for (const e of document.querySelectorAll(sel)) {
        const cs = getComputedStyle(e);
        if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
        const r = e.getBoundingClientRect();
        if (r.width < 2 || r.height < 2 || r.bottom <= 0 || r.right <= 0 || r.top >= H || r.left >= W) continue;
        const zones = [];
        if (cut(r, 0, 0, 1, 1)) zones.push('corner-top-left');
        if (cut(r, W, 0, -1, 1)) zones.push('corner-top-right');
        if (cut(r, 0, H, 1, -1)) zones.push('corner-bottom-left');
        if (cut(r, W, H, -1, -1)) zones.push('corner-bottom-right');
        if (r.top < sa.top) zones.push('top-inset');
        if (r.bottom > H - sa.bottom) zones.push('bottom-inset');
        if (zones.length) out.push({ el: name(e), zones, rect: [r.left, r.top, r.width, r.height].map((v) => Math.round(v)), fixed: persistent(e) });
      }
      return out;
    }, { top: safe.top, bottom: safe.bottom, radius: safe.radius }).catch(() => []);
    const fresh = [];
    for (const f of found) {
      const key = f.el + '|' + f.zones.join(',') + '|' + (f.fixed ? 'fixed' : 'scroll') + (f.fixed ? '' : '|' + f.rect.join(','));
      if (seen.has(key)) continue;
      seen.add(key);
      const ev2 = { name: 'SAFE-AREA', t: base ? +now().toFixed(3) : null, at: label, ...f };
      events.push(ev2); fresh.push(ev2);
      console.warn(`[phone] WARN safe-area: ${f.el} touches ${f.zones.join(' + ')} rect=${f.rect.join(',')}${f.fixed ? ' (fixed/sticky)' : ''}${label ? ' at ' + label : ''}`);
    }
    return fresh;
  };

  let base = 0;
  const now = () => (Date.now() - base) / 1000;
  const ctxObj = {
    page, pointer, cues, mode, url: opt.url, vw, vh, sleep, now, log: console.log, checkSafeArea,
    app: phone ? page.frameLocator('iframe[name=device]') : page,
    get frame() { return appFrame(); },
    device: phone ? dev : null,
    open: async (u, o = {}) => { await appFrame().goto(u || opt.url, { waitUntil: 'load', ...o }); },
    at: async (t) => {
      const w = base + t * 1000 - Date.now();
      if (w > 0) await sleep(w);
      else if (w < -80) events.push({ name: 'LATE', by: +(-w / 1000).toFixed(2), for: t });
    },
    mark: (name) => { const t = +now().toFixed(3); events.push({ name, t }); console.log(`[${mode}] ${name} @ ${t}s`); checkSafeArea(name); },
  };

  if (sc.setup) await sc.setup(ctxObj);          // open the page, wait for it: NOT recorded
  else if (opt.url) await ctxObj.open(opt.url);
  await pointer.reveal().catch(() => {});
  await checkSafeArea('setup');                  // the page at rest, before recording

  // Red marker so the start of the scenario can be found exactly in the video.
  await page.evaluate(() => {
    const m = document.createElement('div');
    m.id = '__marker';
    m.style.cssText = 'position:fixed;inset:0;background:#f00;z-index:2147483647';
    document.documentElement.appendChild(m);
  });
  ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'x11grab', '-draw_mouse', '0', '-framerate', String(fps),
    '-video_size', `${cap.w}x${cap.h}`, '-i', `:${display}+${cap.x},${cap.y}`,
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', crf, '-pix_fmt', 'yuv420p', out],
  { stdio: ['pipe', 'inherit', 'inherit'] });
  let ffDied = false; ff.on('exit', (c) => { if (c) ffDied = true; });
  await sleep(lead * 1000);
  if (ffDied) throw new Error('ffmpeg exited while starting; check that x11grab is available and the output path is writable');
  await page.evaluate(() => document.getElementById('__marker')?.remove());
  base = Date.now();

  await sc.run(ctxObj);
  await sleep(hold * 1000);

  ff.stdin.write('q');
  await new Promise((res) => ff.on('exit', res));
  ff = null;
  writeFileSync(out.replace(/\.[^.]+$/, '') + '.json', JSON.stringify({ mode, vw, vh, dsf, width: cap.w, height: cap.h, device: phone ? dev : undefined, fps, lead, events, errors }, null, 1));
  const warns = events.filter((e) => e.name === 'SAFE-AREA').length;
  console.log(`recorded ${out} (${cap.w}x${cap.h}, ${mode}); page errors: ${errors.length}` + (phone ? `; safe-area warnings: ${warns}` : ''));
} catch (e) {
  console.error('record.mjs: ' + (e && e.stack || e));
  exitCode = 1;
} finally {
  if (ff) { try { ff.stdin.write('q'); await new Promise((r) => { ff.on('exit', r); setTimeout(r, 3000); }); } catch { /* ignore */ } }
  try { await browser.close(); } catch { /* ignore */ }
  await cleanup();
}
process.exit(exitCode);
