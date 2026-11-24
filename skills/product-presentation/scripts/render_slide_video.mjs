#!/usr/bin/env node
// render_slide_video.mjs - render an animated slide as VIDEO with deterministic frame capture.
//
// For slides whose background moves slowly (soft gradient blobs drifting with CSS animations, @property
// custom properties and @keyframes). The animation clock is not left to run: for every frame the script
// pauses all animations and sets their currentTime, takes a PNG and pipes it to ffmpeg, so the output is a
// pure function of time and never drops or repeats frames, however slow the machine is.
//
// THE CLOCK IS THE ABSOLUTE VIDEO TIME. T0 is the moment of the final video where this clip starts, not 0.
// Consecutive steps of the same slide (title only, then box 1, then box 2) are rendered as separate clips with
// their own T0, so the drifting background continues where the previous clip stopped and never jumps at the
// join. Give the clip a little extra duration on each side when it is cross-faded with its neighbours.
//
// Slow motion is captured at a low rate (--cap-fps, default 5) and ffmpeg takes it to 30 fps by blending
// neighbouring frames. Verified indistinguishable from a full-rate capture at 3-10 fps for drifts with cycles
// of 20-30 s; raise --cap-fps for faster motion (a 2 s cycle needs 15+).
//
// Rules for the slide page: animate the background only with CSS animations or transitions (they are driven
// through document.getAnimations()); no JavaScript timers or requestAnimationFrame loops for motion. Element
// transitions that enter content (opacity, transform) are finished before capture, so the clip shows the final
// state of each step; only the animations still running (the background drifts) follow the clock. Put a subtle
// noise layer over soft gradients (see references/recorded-delivery.md) so 8-bit video does not show banding.
//
// Usage
//   node render_slide_video.mjs URL T0 DUR out.mp4 [--size 2560x1440] [--cap-fps 5]
//     URL        http(s):// or file:// URL, or a local path (a #fragment, e.g. slide.html#2, is kept)
//     T0         absolute video time (seconds) where this clip starts
//     DUR        clip length in seconds
//   Options
//     --size WxH       output size in pixels (default 2560x1440)
//     --layout WxH     CSS size of the slide layout (default 1920x1080); the device scale factor is
//                      size / layout, so a 1440p output of a 1920 layout renders at 4/3 and stays sharp
//     --cap-fps N      capture rate (default 5, env CAP_FPS)
//     --fps N          output frame rate (default 30)
//     --crf N          x264 quality (default 16, preset slow)
//     --settle MS      wait after load before the first frame (default 600)
//     --chrome PATH    browser executable (default: env CHROME_PATH, else Playwright's Chromium, else google-chrome)
//
// Dependencies: Node 18+, Playwright (npm i -g playwright, or in the project), a Chromium/Chrome, ffmpeg.
import { createRequire } from 'node:module';
import { execSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

function usage(msg) {
  if (msg) console.error('render_slide_video.mjs: ' + msg);
  console.error('Usage: node render_slide_video.mjs URL T0 DUR out.mp4 [--size 2560x1440] [--layout 1920x1080] [--cap-fps 5] [--fps 30] [--crf 16]');
  process.exit(2);
}

const args = process.argv.slice(2);
const pos = [];
const opt = { size: '2560x1440', layout: '1920x1080', 'cap-fps': process.env.CAP_FPS || '5', fps: '30', crf: '16', settle: '600', chrome: process.env.CHROME_PATH || '' };
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const k = args[i].slice(2);
    if (!(k in opt) || i + 1 >= args.length) usage('unknown or incomplete option ' + args[i]);
    opt[k] = args[++i];
  } else pos.push(args[i]);
}
if (pos.length !== 4) usage('expected URL T0 DUR out.mp4');
const [target, t0s, durs, out] = pos;
const t0 = Number(t0s), dur = Number(durs);
if (!(t0 >= 0) || !(dur > 0)) usage('T0 must be >= 0 and DUR > 0');
const dims = (s, name) => { const m = /^(\d+)x(\d+)$/.exec(s); if (!m) usage(`--${name} must look like 2560x1440`); return [+m[1], +m[2]]; };
const [W, H] = dims(opt.size, 'size');
const [LW, LH] = dims(opt.layout, 'layout');
const CAP = Number(opt['cap-fps']), FPS = Number(opt.fps);

const url = /^(https?|file):/.test(target) ? target : (() => {
  const [file, frag] = target.split('#');
  if (!existsSync(file)) usage('file not found: ' + file);
  return pathToFileURL(resolve(file)).href + (frag !== undefined ? '#' + frag : '');
})();

let chromium;
try { ({ chromium } = await import('playwright')); } catch {
  try { chromium = createRequire(import.meta.url)(execSync('npm root -g').toString().trim() + '/playwright').chromium; }
  catch { console.error('render_slide_video.mjs: Playwright not found (npm i -g playwright)'); process.exit(1); }
}
let browser;
for (const exe of [opt.chrome || undefined, undefined, '/usr/bin/google-chrome']) {
  try { browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] }); break; } catch (e) { if (exe === '/usr/bin/google-chrome') throw e; }
}

const page = await browser.newPage({ viewport: { width: LW, height: LH }, deviceScaleFactor: W / LW });
await page.goto(url);
await page.reload(); // so a #fragment step is applied from a fresh load
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(Number(opt.settle));
// entering transitions are already at their end state (as in a still of the step); only running animations follow the clock
await page.evaluate(() => document.getAnimations().forEach((a) => { if (a instanceof CSSTransition) a.finish(); }));

const n = Math.ceil(dur * CAP) + 2;
const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(CAP), '-i', '-',
  '-vf', `scale=${W}:${H}:flags=lanczos,framerate=fps=${FPS}:interp_start=0:interp_end=255:scene=100`,
  '-t', dur.toFixed(3), '-c:v', 'libx264', '-preset', 'slow', '-crf', opt.crf, '-pix_fmt', 'yuv420p', '-r', String(FPS), '-an', out],
  { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((res, rej) => { ff.on('error', rej); ff.on('exit', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)))); ff.stdin.on('error', () => {}); });

for (let i = 0; i < n; i++) {
  const ms = (t0 + i / CAP) * 1000;
  await page.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; }), ms);
  const png = await page.screenshot({ type: 'png' });
  if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
}
ff.stdin.end();
await done;
await browser.close();
console.log(`wrote ${out}: ${dur}s at ${FPS} fps from absolute time ${t0}s (${n} frames captured at ${CAP} fps)`);
