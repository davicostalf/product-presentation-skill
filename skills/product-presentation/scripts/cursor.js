// cursor.js - visible pointer for screen recordings of a scripted browser.
//
// Why: scripted or headless browsers draw NO mouse pointer, and ffmpeg's x11grab
// is run with -draw_mouse 0. Without an injected pointer the recording shows
// things happening by themselves. This module injects a DOM overlay that follows
// the real (Playwright) mouse events and animates presses, and offers a small
// Node API to glide the mouse, click, type and scroll like a person would.
//
// Dependencies: Node 18+, `playwright` (any recent version). No other packages.
//
// Usage (Playwright, Node):
//   const { chromium } = require('playwright');
//   const cursor = require('./cursor.js');
//   const ctx = await browser.newContext();
//   await cursor.install(ctx, { mode: 'desktop' });     // before navigating: addInitScript
//   const page = await ctx.newPage();
//   await page.goto(url);
//   const pointer = await cursor.attach(page, { mode: 'desktop' });
//   await pointer.click(page.getByRole('button', { name: 'Search' }));
//
// Modes:
//   desktop  small black arrow with white outline, 24 px, scales down on press.
//   phone    translucent touch dot, 36 px, shrinks on press, soft ripple on tap.
//
// Rules this implements (see SKILL.md): the pointer glides on an eased curve and
// never jumps; every click has a press animation; pointTo() rests near a target,
// not on top of it, when `near` is set, so hover-only controls do not appear.

'use strict';

// ---- Browser side ----------------------------------------------------------
// Serialized with Function.prototype.toString and run in every document, so it
// must not reference anything from the Node scope.
function overlay(opts) {
  if (window.__pointerInit) return;
  window.__pointerInit = true;
  const mode = opts.mode;
  const clean = opts.clean;
  const topOnly = opts.where !== 'all';
  if (topOnly && window.self !== window.top) return;

  const start = () => {
    const root = document.documentElement;
    const st = document.createElement('style');
    st.textContent =
      '#__ptr,#__rip{pointer-events:none}' +
      '@keyframes __rip{from{transform:translate(-50%,-50%) scale(.3);opacity:.7}' +
      'to{transform:translate(-50%,-50%) scale(1);opacity:0}}' +
      (clean
        ? '*{scrollbar-width:none!important}::-webkit-scrollbar{width:0!important;height:0!important;display:none!important}' +
          ':focus-visible{outline:none!important;box-shadow:none!important}'
        : '');
    root.appendChild(st);

    if (clean) {
      // Native tooltips (title attributes) would pop up over the pointer.
      const strip = (n) => {
        try {
          if (n.removeAttribute && n.hasAttribute && n.hasAttribute('title')) n.removeAttribute('title');
          if (n.querySelectorAll) n.querySelectorAll('[title]').forEach((e) => e.removeAttribute('title'));
        } catch (e) { /* ignore */ }
      };
      strip(document);
      new MutationObserver((ms) => {
        for (const m of ms) {
          if (m.type === 'attributes') m.target.removeAttribute('title');
          else m.addedNodes.forEach((n) => n.nodeType === 1 && strip(n));
        }
      }).observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['title'] });
    }

    const ptr = document.createElement('div');
    ptr.id = '__ptr';
    ptr.style.cssText =
      'position:fixed;left:0;top:0;z-index:2147483647;will-change:transform;' +
      'transform:translate(-100px,-100px);pointer-events:none';
    const desktop = mode === 'desktop';
    if (desktop) {
      ptr.innerHTML =
        '<svg id="__body" width="24" height="24" viewBox="0 0 24 24" style="display:block;' +
        'transform-origin:3px 2px;transition:transform .08s;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">' +
        '<path d="M3 2 L3 18.5 L7.4 14.6 L10.2 21 L12.9 19.8 L10.2 13.6 L16 13.4 Z" ' +
        'fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    } else {
      ptr.innerHTML =
        '<div id="__body" style="position:absolute;left:-18px;top:-18px;width:36px;height:36px;' +
        'border-radius:50%;background:rgba(30,30,30,.30);border:2px solid rgba(255,255,255,.85);' +
        'box-shadow:0 2px 8px rgba(0,0,0,.25);transition:transform .08s"></div>';
    }
    root.appendChild(ptr);
    const body = () => document.getElementById('__body');

    const ripple = (x, y) => {
      const size = desktop ? 56 : 88;
      const r = document.createElement('div');
      r.id = '__rip';
      r.style.cssText =
        'position:fixed;left:' + x + 'px;top:' + y + 'px;width:' + size + 'px;height:' + size + 'px;' +
        'border-radius:50%;border:2px solid rgba(60,90,140,.6);background:rgba(60,90,140,.10);' +
        'z-index:2147483646;animation:__rip .5s ease-out forwards';
      root.appendChild(r);
      setTimeout(() => r.remove(), 600);
    };

    addEventListener('mousemove', (e) => {
      ptr.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
    }, true);
    addEventListener('mousedown', (e) => {
      const b = body();
      if (b) b.style.transform = desktop ? 'scale(.86)' : 'scale(.8)';
      if (opts.ripple) ripple(e.clientX, e.clientY);
    }, true);
    addEventListener('mouseup', () => {
      const b = body();
      if (b) b.style.transform = '';
    }, true);
  };

  if (document.documentElement) start();
  else document.addEventListener('DOMContentLoaded', start);
}

function initScript(options) {
  const o = Object.assign({ mode: 'desktop', clean: true, where: 'top', ripple: true }, options);
  return '(' + overlay.toString() + ')(' + JSON.stringify(o) + ')';
}

/** Install the overlay in every page/frame of a BrowserContext (call before navigating). */
async function install(context, options) {
  await context.addInitScript(initScript(options));
}

// ---- Node side -------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/**
 * Pointer controller bound to a Playwright page.
 * Returns { move, pointTo, press, click, aim, type, scroll, park, reveal, pos }.
 * All motion is eased and takes real time: never call page.mouse.move for a
 * large distance directly, the pointer would jump.
 */
async function attach(page, options) {
  const o = Object.assign({ mode: 'desktop', x: null, y: null, speed: 0.9 }, options);
  const vp = (await page.evaluate(() => [innerWidth, innerHeight]).catch(() => [1280, 720]));
  const s = { x: o.x ?? vp[0] / 2, y: o.y ?? vp[1] / 2 };
  await page.mouse.move(s.x, s.y);
  // A navigation creates a fresh document whose overlay starts off-screen; re-emit the
  // last position so the pointer stays visible across page transitions.
  page.on('domcontentloaded', () => { page.mouse.move(s.x, s.y).catch(() => {}); });

  const pointer = {
    /** Re-emit the current position (makes the overlay appear after a navigation). */
    reveal() { return page.mouse.move(s.x, s.y); },

    get pos() { return { x: s.x, y: s.y }; },

    /** Glide to (x, y) in viewport CSS px along a slightly curved, eased path. */
    async move(x, y, ms = 550) {
      const x0 = s.x, y0 = s.y, dx = x - x0, dy = y - y0, dist = Math.hypot(dx, dy);
      if (dist < 1) return;
      ms = Math.min(1800, Math.max(ms, dist / o.speed));       // long paths take longer
      const nx = -dy / dist, ny = dx / dist;
      const bend = Math.min(40, dist * 0.06) * (dx >= 0 ? 1 : -1);
      const cx = (x0 + x) / 2 + nx * bend, cy = (y0 + y) / 2 + ny * bend;
      const t0 = Date.now();
      for (;;) {
        const k = Math.min(1, (Date.now() - t0) / ms), e = ease(k);
        const px = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * cx + e * e * x;
        const py = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * cy + e * e * y;
        await page.mouse.move(px, py);
        if (k >= 1) break;
        await sleep(8);
      }
      s.x = x; s.y = y;
    },

    /** Glide to a locator. fx/fy pick the point inside the box (0..1). */
    async pointTo(locator, { ms = 550, fx = 0.5, fy = 0.5, near = 0 } = {}) {
      const b = await locator.boundingBox({ timeout: 5000 });
      if (!b) throw new Error('pointer.pointTo: target has no bounding box (hidden or detached)');
      // near > 0 rests this many px BELOW the box instead of on it (to point without hovering)
      const y = near ? b.y + b.height + near : b.y + b.height * fy + (Math.random() * 4 - 2);
      await pointer.move(b.x + b.width * fx + (Math.random() * 4 - 2), y, ms);
      return b;
    },

    /** Press animation: mouse down, short hold, mouse up. */
    async press() {
      await page.mouse.down();
      await sleep(70);
      await page.mouse.up();
    },

    /** Glide to the locator, pause briefly, press. */
    async click(locator, o2 = {}) {
      await pointer.pointTo(locator, o2);
      await sleep(o2.pause ?? 120);
      await pointer.press();
    },

    /** Wait for the target to stop moving (animations, layout), then point to it. */
    async aim(locator, o2 = {}) {
      const settle = async () => {
        let last = null, n = 0;
        for (let i = 0; i < 60; i++) {
          const b = await locator.boundingBox({ timeout: 3000 }).catch(() => null);
          if (b && last && Math.abs(b.x - last.x) < 0.5 && Math.abs(b.y - last.y) < 0.5) { if (++n >= 2) return b; } else n = 0;
          last = b;
          await sleep(30);
        }
        return last;
      };
      await settle();
      await pointer.pointTo(locator, o2);
    },

    /**
     * Type like a person: per-character delay (cps characters per second, +-20% jitter),
     * or fit the whole text in `secs` seconds. A longer pause follows , . ? !
     */
    async type(text, { cps = 14, secs = null, pauseAfter = 220 } = {}) {
      const per = secs ? (secs * 1000) / Math.max(1, text.length) : 1000 / cps;
      for (const ch of text) {
        await page.keyboard.type(ch);
        await sleep(per * (0.8 + Math.random() * 0.4) + (/[,.?!]/.test(ch) && !secs ? pauseAfter : 0));
      }
    },

    /** Eased mouse-wheel scroll by dy CSS px over ms, with the pointer parked at its position. */
    async scroll(dy, ms = 700) {
      await page.mouse.move(s.x, s.y);
      const t0 = Date.now();
      let done = 0;
      for (;;) {
        const k = Math.min(1, (Date.now() - t0) / ms);
        const d = dy * ease(k) - done;
        if (Math.abs(d) > 0.5) { await page.mouse.wheel(0, d); done += d; }
        if (k >= 1) break;
        await sleep(16);
      }
    },

    /** Move the pointer out of the way (a quiet spot) without clicking. */
    park(x, y, ms = 450) { return pointer.move(x, y, ms); },
  };
  return pointer;
}

module.exports = { initScript, install, attach, sleep, ease };
