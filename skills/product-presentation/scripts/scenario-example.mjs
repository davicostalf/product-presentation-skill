// scenario-example.mjs - minimal scenario for record.mjs / run_pair.sh, driven by a cue list.
//
// It shows the whole vocabulary of a real capture: open the page (not recorded), glide the
// pointer to a field, type with pauses, click, wait for the page to load, scroll. Every action
// is aligned to a cue: seconds on the narration clock, from cues.py (word timestamps).
//
// Run against the placeholder page that ships with the skill:
//   S=skills/product-presentation
//   node $S/scripts/record.mjs --scenario $S/scripts/scenario-example.mjs \
//        --url file://$PWD/$S/assets/placeholder-store.html --cues $S/assets/example-cues.json \
//        --mode desktop --out desktop.mkv
// or both desktop and phone at once:
//   bash $S/scripts/run_pair.sh $S/scripts/scenario-example.mjs file://$PWD/$S/assets/placeholder-store.html out $S/assets/example-cues.json
// then: python3 $S/scripts/compose.py --desktop out/desktop.mkv --phone out/phone.mkv --out out/demo.mp4
//
// To use it for a real prototype: copy it, change the selectors and the typed text, and give
// every action its own cue key. Keep these rules:
//   - The screen shows the thing 0.3-0.8 s BEFORE the words name it: use cues from cues.py with
//     --advance, or subtract the lead here (the `lead` constant).
//   - Never act while a loading state is up: wait for the result, then continue.
//   - Move the pointer BEFORE the cue so it arrives on time; the press lands on the cue.
//   - A short pause between filling a field and submitting it (a person reads what they typed).
//
//   - Locate prototype elements through `app`, never `page`: on desktop `app` is the Page, on the
//     phone it is a frameLocator for the 390x844 iframe that holds the prototype (the page there is
//     only the host). `app.locator(...)` and `app.getByRole(...)` then work in both modes.
//   - Keep interactive elements out of the rounded corners and the top/bottom safe areas of the
//     phone; record.mjs logs SAFE-AREA warnings (in <out>.json and on stderr) when they are not.
//
// Contract with record.mjs: export setup(ctx) (not recorded) and run(ctx) (recorded; scenario
// time 0 is when the recording starts).
// ctx = { page, app, frame, open, pointer, cues, mode, url, device, at, mark, sleep, checkSafeArea }
// Dependencies: none beyond record.mjs.

const lead = 0.0; // extra seconds the screen should lead the words, on top of the cue list

export async function setup({ app, open, url }) {
  await open(url);                                      // page.goto on desktop, iframe load on the phone
  await app.locator('input[type=search]').waitFor();    // page is ready BEFORE recording starts
}

export async function run({ app, pointer, cues, mode, device, at, mark, sleep }) {
  const when = (key) => Math.max(0.05, cues[key] - lead);
  const field = app.locator('input[type=search]');
  const submit = app.getByRole('button', { name: 'Search' });

  // 1. Glide to the field and focus it, arriving as the sentence starts.
  await at(when('type') - 1.3);
  await pointer.click(field, { ms: 700 });
  mark('field-focused');

  // 2. Type like a person, finishing a little before the send cue.
  await at(when('type'));
  const text = 'wooden desk chair';
  await pointer.type(text, { secs: Math.max(1.5, when('send') - when('type') - 0.9) });
  mark('typed');

  // 3. Glide to the button during the pause, press exactly on the cue.
  await pointer.pointTo(submit, { ms: 500 });
  await at(when('send'));
  await pointer.press();
  mark('submitted');

  // 4. Wait for the page to finish loading; never act on a skeleton.
  await app.locator('#results.in').waitFor({ timeout: 15000 });
  mark('results-visible');
  // Rest in a quiet spot, not on a card. Phone coordinates are host-page px: offset by the iframe rect.
  // park() keeps the pointer fully inside the screen (clear of edges, corners and safe areas).
  if (mode === 'phone') await pointer.park(device.x + 340, device.y + 262, 600);
  else await pointer.park(900, 330, 600);

  // 5. Scroll the results with an eased wheel, on the cue.
  await at(when('scroll'));
  await pointer.scroll(520, 900);
  await sleep(500);
  await pointer.scroll(-260, 700);
  mark('scrolled');
}
