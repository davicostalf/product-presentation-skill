// scenario-slide-example.mjs - record a slide LIVE so its animations play on camera.
//
// Slides that animate are recorded in a real browser, not exported as images: the animation is
// triggered by a narration cue and the video shows it happening. Run record.mjs with --no-cursor
// (a slide has no pointer):
//   node record.mjs --scenario scenario-slide-example.mjs --url http://localhost:8000/slide-3.html \
//        --cues cues.json --no-cursor --out slide-3.mkv
//
// The page contract is yours to define; this example expects the slide to expose
//   window.__ready  (Promise: fonts and images loaded)
//   window.__start({ stepName: seconds, ... })  (starts the animation plan; times are relative to the call)
// Dependencies: none beyond record.mjs.

export async function setup({ page, url }) {
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => window.__ready);            // everything loaded before the first frame
}

export async function run({ page, cues, at, mark, sleep }) {
  // Each element enters 0.3 s before the word that names it.
  const plan = { title: 0.2, body: Math.max(0.4, (cues.body ?? 1) - 0.3), figure: Math.max(0.6, (cues.figure ?? 2) - 0.3) };
  await at(0.3);
  await page.evaluate((p) => window.__start(p), plan);
  mark('animation-started');
  await sleep((Math.max(...Object.values(plan)) + 2.5) * 1000);   // hold the final state
}
