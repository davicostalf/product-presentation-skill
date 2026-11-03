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
//   --width/--height  viewport in CSS px (desktop 1440x900, phone 500x1084)
//   --scale N         device scale factor (desktop 1.5 -> 2160x1350, phone 2 -> 1000x2168)
//   --display N       X display number (default 90 desktop, 91 phone)
//   --port N          Chromium remote-debugging port (default 9390 desktop, 9391 phone)
//   --fps N           capture frame rate (default 30)
//   --crf N           x264 quality of the raw capture (default 12; near-lossless)
//   --lead S          seconds of marker (solid red) before scenario time 0 (default 1.2)
//   --hold S          seconds kept recording after run() returns (default 0.7)
//   --no-cursor       do not draw the pointer (slides and other non-interactive pages only)
//   --keep-ui         keep the pointer overlay's scrollbar/focus-ring/tooltip cleanup off
//
// Scenario contract (see scenario-example.mjs):
//   export async function setup(ctx) { await ctx.page.goto(ctx.url); ... }   // not recorded
//   export async function run(ctx)   { await ctx.at(ctx.cues.start); ... }   // recorded, t=0 at start
// ctx = { page, pointer, cues, mode, url, vw, vh, sleep, at(t), now(), mark(name), log }
//   at(t)   waits until scenario time t seconds; records LATE if the scenario is already behind
//   mark(n) logs an event with its scenario time (written to <out>.json)
//
// Time zero: a red marker covers the page while ffmpeg starts, then disappears. compose.py
// finds the first non-red frame and cuts both clips there, so desktop and phone share t=0.
//
// The 'Chrome for Testing' banner is removed with --test-type --disable-infobars. The window
// is fullscreen (--kiosk) on a display exactly the size of the capture, so the video is the
// page and nothing else. Chromium refuses windows narrower than 500 CSS px, which is why the
// phone viewport is 500 wide by default (compose.py scales it into the phone frame).

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
const flags = new Set(['--no-cursor', '--keep-ui', '--help']);
const opt = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) fail('unexpected argument ' + a);
  if (flags.has(a)) opt[a.slice(2)] = true;
  else { opt[a.slice(2)] = argv[++i]; if (opt[a.slice(2)] === undefined) fail('missing value for ' + a); }
}
if (opt.help || !opt.scenario) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).slice(0, 62).map((l) => l.slice(3)).join('\n'));
  process.exit(opt.help ? 0 : 2);
}
const mode = opt.mode || 'desktop';
if (!['desktop', 'phone'].includes(mode)) fail('--mode must be desktop or phone');
const phone = mode === 'phone';
const vw = +(opt.width || (phone ? 500 : 1440));
const vh = +(opt.height || (phone ? 1084 : 900));
const dsf = +(opt.scale || (phone ? 2 : 1.5));
const display = +(opt.display || (phone ? 91 : 90));
const port = +(opt.port || (phone ? 9391 : 9390));
const fps = +(opt.fps || 30);
const crf = String(opt.crf || 12);
const lead = +(opt.lead || 1.2);
const hold = +(opt.hold || 0.7);
const out = resolve(opt.out || `${mode}.mkv`);
const W = Math.ceil(vw * dsf), H = Math.ceil(vh * dsf);
if (phone && vw < 500) console.warn('record.mjs: warning: Chromium windows are at least 500 CSS px wide; --width ' + vw + ' will be widened.');

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
  }

  const useCursor = !opt['no-cursor'];
  if (useCursor) await cursor.install(ctx, { mode: phone ? 'phone' : 'desktop', clean: !opt['keep-ui'] });
  const pointer = await cursor.attach(page, { mode: phone ? 'phone' : 'desktop' });

  const cues = opt.cues ? JSON.parse(readFileSync(opt.cues, 'utf8')) : {};
  const sc = await import(pathToFileURL(resolve(opt.scenario)).href);
  if (typeof sc.run !== 'function') throw new Error('scenario must export an async run(ctx)');

  let base = 0;
  const now = () => (Date.now() - base) / 1000;
  const ctxObj = {
    page, pointer, cues, mode, url: opt.url, vw, vh, sleep, now, log: console.log,
    at: async (t) => {
      const w = base + t * 1000 - Date.now();
      if (w > 0) await sleep(w);
      else if (w < -80) events.push({ name: 'LATE', by: +(-w / 1000).toFixed(2), for: t });
    },
    mark: (name) => { const t = +now().toFixed(3); events.push({ name, t }); console.log(`[${mode}] ${name} @ ${t}s`); },
  };

  if (sc.setup) await sc.setup(ctxObj);          // open the page, wait for it: NOT recorded
  else if (opt.url) await page.goto(opt.url);
  await pointer.reveal().catch(() => {});

  // Red marker so the start of the scenario can be found exactly in the video.
  await page.evaluate(() => {
    const m = document.createElement('div');
    m.id = '__marker';
    m.style.cssText = 'position:fixed;inset:0;background:#f00;z-index:2147483647';
    document.documentElement.appendChild(m);
  });
  ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'x11grab', '-draw_mouse', '0', '-framerate', String(fps),
    '-video_size', `${W}x${H}`, '-i', `:${display}+0,0`,
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
  writeFileSync(out.replace(/\.[^.]+$/, '') + '.json', JSON.stringify({ mode, vw, vh, dsf, width: W, height: H, fps, lead, events, errors }, null, 1));
  console.log(`recorded ${out} (${W}x${H}, ${mode}); page errors: ${errors.length}`);
} catch (e) {
  console.error('record.mjs: ' + (e && e.stack || e));
  exitCode = 1;
} finally {
  if (ff) { try { ff.stdin.write('q'); await new Promise((r) => { ff.on('exit', r); setTimeout(r, 3000); }); } catch { /* ignore */ } }
  try { await browser.close(); } catch { /* ignore */ }
  await cleanup();
}
process.exit(exitCode);
