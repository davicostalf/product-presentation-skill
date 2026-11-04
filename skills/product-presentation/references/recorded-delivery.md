# Recorded delivery

How to turn an approved storyboard into a narrated video.

## Contents

- Recording the narration
- Audio treatment
- Capture and assembly
- Capture rules and pipeline
- Verification
- Reference timings

## Recording the narration

- **Teleprompter** generated from the script, one sentence highlighted at a time, sections marked.
  - Default pace around 120 words per minute, adjustable while reading.
  - Serve the voice-following mode from `http://localhost`: opened as `file://`, the browser asks for the microphone on every restart of recognition.
- Record everything in one file, with about 2 s of silence between sections.
- To replace a sentence later, re-record only it, in the same place and with the same microphone.

## Audio treatment

- **Light treatment that preserves the voice** (`scripts/treat_audio.sh`): high-pass, click removal, gentle noise reduction, peak repair, subtle EQ, light compression, loudness normalization. Do not change pitch or speed.
- **Cuts** at energy minima, with a short fade (`scripts/cut_audio.py`). After cutting, re-transcribe the region and check that no word fragment is left.
- **Remove** false starts, repetitions and long silences. Keep breaths and natural pauses.
- **Splicing a re-recorded sentence:** apply the same treatment, splice at energy minima, transcribe only the new segment and remap the timings of the rest.
- **Extra pauses** (for loading, an attachment or a section change) are made with room tone taken from silent stretches of the same recording.

## Capture and assembly

### Capture rules and pipeline

The rules in SKILL.md ("Prototype capture rules") apply in full: the prototype parts are continuous screen video of the live interaction, with an injected pointer, on the fixed flat composition, and capture stops with a clear message if the environment cannot do it.

- **Always screen video, never stills.** Typing, clicks, scrolls, page transitions and loading states are recorded as they happen. A video built from screenshots or storyboard frames is a failed delivery.
- **Run remotely:** in a remote Claude Code session or a Linux container/VM (4+ CPUs, 8+ GB RAM), never on the presenter's computer. On constrained machines record desktop and phone one after the other instead of in parallel, and use a small transcription model (`--model small`).
- **Check the environment first:** `scripts/check_env.sh`. Missing Xvfb, Chromium/Playwright or ffmpeg means stop and tell the user.
- **Pointer:** injected by `scripts/cursor.js` (headless and scripted browsers draw none). Arrow on desktop, translucent dot on phone, eased glides, press animation, resting near targets and never on hover-action elements.
- **Pipeline, per case:**
  1. Cues: `scripts/transcribe.py` on the cut narration, then `scripts/cues.py` with named phrases. Use `--advance` so the screen shows the thing 0.3-0.8 s before the words.
  2. Scenario: copy `scripts/scenario-example.mjs`, adapt selectors and text. The scenario acts on cues: pointer moves before the cue, the press lands on it, it waits for loading to finish. Open the page with `ctx.open(url)` and locate elements with `ctx.app` (`app.locator(...)`, `app.getByRole(...)`): on the phone `app` is a frame locator for the prototype iframe, on desktop it is the page.
  3. Record: `scripts/run_pair.sh scenario.mjs URL out cues.json` (desktop and phone in parallel) or `scripts/record.mjs` for one clip. Each clip starts with a red marker that fixes time zero. Read the `SAFE-AREA` warnings in `out/phone.log` and `out/phone.json` (see Phone capture below).
  4. Compose: `scripts/compose.py --desktop ... --phone ... --out ... --height 1440` (or 1080).
- **Composition:** flat `#F2F3F5` background, desktop left and phone right with a rounded phone frame, no cards, borders or shadows. 1920x1080: desktop 1336x835 at (50, 122), phone 416x900 at (1440, 90), phone corner radius 47. 2560x1440: desktop 1781x1113 at (67, 163), phone 555x1200 at (1920, 120), radius 63. The phone slot has the 390:844 aspect of the captured screen, so the clip is scaled whole with no crop. Target look: `assets/reference-frame.png`.
### Phone capture

- **Real width.** The prototype runs in an iframe of 390x844 CSS px (`--device WxH` to change it) inside a host page: flat background, iframe centered, window of at least 500 px (the Chromium minimum). ffmpeg records exactly the iframe rect in screen pixels (780x1688 at scale 2), so layout, media queries and the 2-column grids are those of a 390 px phone. The prototype must allow framing (no `X-Frame-Options` / CSP `frame-ancestors` that rejects the host); for a local dev server that is the default.
- **Pointer.** The touch dot is injected into the iframe's own document (`cursor.js`, option `where: 'frames'`), so it follows Playwright's mouse, shows the press and ripple, and is clipped at the screen edge. Targets are located with `ctx.app` (frame locator), and `pointer.pointTo/click/scroll` work in host coordinates automatically. `ctx.device` is the iframe rect `{ x, y, w, h }` in host CSS px, for parking the pointer.
- **Safe areas.** The host defines insets of 47 px at the top (status area) and 34 px at the bottom (home indicator), and a 44 px corner radius at 390 px width (`--safe-top`, `--safe-bottom`, `--safe-radius` to change). It exposes them to the prototype in two ways: the CSS custom properties `--safe-area-inset-top/-bottom/-left/-right` and `--safe-area-corner-radius` on the root element of the iframe document, and the browser's safe-area emulation, so `env(safe-area-inset-top)` also resolves. Write `padding-top: max(env(safe-area-inset-top, 0px), var(--safe-area-inset-top, 0px))` to cover both. A fake status bar (time, signal, battery) and a home indicator are drawn in the insets (`--no-status-bar` to omit them).
- **Safe-area check.** After setup and at every `mark()`, `record.mjs` finds the visible interactive elements (links, buttons, inputs, `role=button|tab|...`, `onclick`, focusable) whose box touches a rounded corner (outside the arc), the top band or the bottom band, and logs each once as a `SAFE-AREA` event (zone, element, rect, fixed/sticky) in `<out>.json` and as a warning on stderr (`--no-safe-check` to skip). Fixed or sticky elements in a band are always a problem. Scrolling content crosses the bands while it moves, so judge those warnings by the resting positions. Fix the prototype, not the check.
- **Slides** that animate are recorded live with `scripts/record.mjs --no-cursor` (see `scripts/scenario-slide-example.mjs`), each animation triggered by the narration cue.

### Assembly

- **Record once, at the final resolution** (e.g. 1440p). Smaller versions are downscaled from the same material.
- **Desktop and phone in parallel**, on two virtual displays, on the same clock.
- **Record per segment inside each case** (search, results, cart), keeping the encoded segments. A prototype change re-records only the affected segment.
- **Fix sync in the edit.** When an action lands late, insert a room-tone pause in the audio before the sentence and a freeze of the same length in the video right after the action. Do not re-record for this.
- **Assemble from parts** encoded separately and joined without re-encoding. Never one huge filter graph.
- **Encoding:** fast for reviews (`compose.py` defaults); high quality only for the final export (`--crf 17 --preset medium`).
- **Audio-only changes** replace only the audio track of an assembled video.

## Verification

- One frame per spoken line, on contact sheets, checked against the storyboard before delivery.
- Check that the video moves: frames from different seconds of a prototype segment must differ (pointer in a new place, text typed, page changed). A segment where frames repeat is a slideshow.
- Probes in the page during capture (e.g. log every 50 ms whether any hover button is visible), to prove what the eye cannot see in thumbnails.
- Sensitive points:
  - screen loaded before the narration mentions it;
  - case covers holding through the case intro;
  - pauses at changes;
  - animations entering on the right words.

## Reference timings

| Change | Time |
|---|---|
| Sync adjustment | ~10 min |
| Changed prototype segment | ~15 min |
| Full re-assembly | ~25 min |
