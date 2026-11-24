# Recorded delivery

How to turn an approved storyboard into a narrated video.

## Contents

- Recording the narration
- Teleprompter
- Audio treatment
- One take, many lines
- Capture and assembly
- Capture rules and pipeline
- Animated slides as video
- Verification
- Reference timings

## Recording the narration

- **Teleprompter** generated from the script (see Teleprompter below).
- Record everything in one file, with about 2 s of silence between sections.
- To replace a sentence later, re-record only it, in the same place and with the same microphone.
- **Ask for the lossless original.** An exported or compressed copy (a chat or meeting export at 24 kHz and 32 kbps, a phone voice-memo share) has lost detail the treatment cannot bring back. Ask for the file as the recorder wrote it; a float original (for example AIFF-C 32-bit float) can hold peaks above 0 dBFS that a 16-bit file would have clipped, and lowering the gain before any other treatment recovers them. For a large file, a temporary shared link, revoked after the download.
- **Several takes of the same passage:** before judging them, check whether they are the same take (cross-correlate the audio; the same take at different quality shows a sharp peak). Two copies of one take are not two options.

## Teleprompter

`scripts/teleprompter.py script.json out.html [--wpm 120] [--lang en|pt]` builds one HTML page from the script, using `assets/teleprompter.html` as the template. The sentence being read is bright on a fixed reading line, the ones before it dim, sections marked, and the screen each line goes with shown when it changes.

- **Script shape.** Either the project script, `{"sections": [{"id": "intro", "cover": "Case 1 of 3", "lines": [{"text": "...", "screen": "what is on screen", "slide": "ref"}]}]}` (the section heading is `head`, `title`, `cover` or `id`; `screen` is shown when it changes), or a plain list `[{"head": "Intro", "cue": "optional screen note", "lines": ["sentence", "..."]}]`. In a line's text, `/` marks a breath and `_word_` underlines a stressed word.
- **Two ways to follow the reader.** *Pace* (Ritmo) rolls the text at a steady rate, about 120 words per minute, adjustable while reading, with a pause between sections. *Voice* uses the browser's speech recognition: it matches the last ~6 recognized words against a forward window of the script (longer words weigh more), widens the window after ~4 s without a match, restarts recognition when the browser ends it (and after ~8 s with no results), and retries on network errors instead of stopping. It says what is wrong in plain words: microphone blocked, wrong microphone or no speech heard, no network.
- **Language.** `--lang` sets the interface labels (`en`, `pt`; `--ui ui.json` overrides any label) and the recognition language, which must be the script's language. `--speech-lang` overrides the locale (`en-GB`).
- **Also:** 3-2-1 countdown, screen wake lock, text size, mirror, previous and next sentence, keyboard (space, arrows, R).
- **Serve it, never `file://`.** Voice mode needs a secure origin and internet (Chrome sends the audio to its recognition service): run `python3 -m http.server 8000` in the folder with the page and open `http://localhost:8000/out.html` in Chrome or Edge (Web Speech API). Opened as `file://` the browser asks for the microphone on every restart of recognition, and other browsers may have no recognition at all; Pace mode still works there.

## Audio treatment

- **Light treatment that preserves the voice** (`scripts/treat_audio.sh`): high-pass, click removal, gentle noise reduction, peak repair, subtle EQ, light compression, loudness normalization. Do not change pitch or speed.
- **Cuts** at energy minima, with a short fade (`scripts/cut_audio.py`). After cutting, re-transcribe the region and check that no word fragment is left.
- **Remove** false starts, repetitions and long silences. Keep breaths and natural pauses.
- **Splicing a re-recorded sentence:** apply the same treatment, splice at energy minima, transcribe only the new segment and remap the timings of the rest.
- **Extra pauses** (for loading, an attachment or a section change) are made with room tone taken from silent stretches of the same recording.

## One take, many lines

When the presenter recorded the whole script in one continuous take, `scripts/split_lines.py narration.wav words.json script.json outdir/` cuts it into one file per script line (`00.wav`, `01.wav`, ...). Treat and cut the take first (`treat_audio.sh`, `cut_audio.py`), transcribe the result (`transcribe.py`), then split.

- It aligns the transcript to the script lines (difflib on normalized words) and cuts each boundary at the centre of the longest silence between the last word of line N and the first of line N+1, with 8 ms fades. It writes `boundaries.json` (cut times, line ranges) and `report.json` too.
- **It reports, it does not edit.** Read the report: *tight* boundaries (under 0.4 s of silence: listen to both sides), *deviations* (script words not said, words said that are not in the script; numbers often differ between written and spoken form), and *repeats* (repeated words or phrases with timestamps: false starts to cut by hand with `cut_audio.py`, or to re-record).
- Words the presenter improved while speaking show up as deviations; bring them back into the script (see SKILL.md) and re-run, so the script and the lines agree.
- Transcribe each per-line file again when a scenario needs word times inside a line (see "Multi-step actions follow the words" in SKILL.md).

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

### Animated slides as video

Slides with a slowly moving background (soft gradient blobs drifting with CSS `@property` custom properties and `@keyframes`) are rendered as video by `scripts/render_slide_video.mjs URL T0 DUR out.mp4 [--size 2560x1440] [--cap-fps 5]`: for every frame it pauses all animations, sets their `currentTime`, takes a PNG and pipes it to ffmpeg, which writes 30 fps. The result is deterministic, whatever the machine's speed.

- **The clock is the absolute video time.** T0 is where the clip starts in the final video, not 0. Consecutive steps of the same slide (title only, box 1, box 2) are separate clips with their own T0, so the drift continues where the previous one stopped and never jumps. Add half the cross-fade to each side of a clip that is cross-faded with its neighbours.
- **Slow motion is captured at a low rate.** Drifts with cycles of 20-30 s are indistinguishable from a full-rate capture at 3-10 fps (`--cap-fps 5` is the default; ffmpeg blends neighbouring frames up to 30 fps). Faster motion needs a higher rate.
- **Animate the background only with CSS animations**, never with JavaScript timers. Entering transitions (a card fading in) are finished before capture, so each step shows its final state.
- **Add a subtle noise layer over soft gradients.** 8-bit video bands a smooth gradient into visible steps; a faint grain over it hides them:

  ```css
  .noise { position: absolute; inset: 0; pointer-events: none; opacity: 1;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .05 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
  ```
- **Resolution:** `--layout` is the CSS size of the slide (default 1920x1080) and `--size` the output; the device scale factor is the ratio, so a 1920 layout at 2560x1440 renders at 4/3 and stays sharp.
- A static slide (a back cover) needs no video: loop its PNG.
- Slides that react to the narration live are still recorded with `record.mjs --no-cursor` (above).

### Assembly

- **Record once, at the final resolution** (e.g. 1440p). Smaller versions are downscaled from the same material.
- **Final resolution end to end.** For a 1440p delivery every source is 1440p or better: slides rendered at 1440p (device scale factor 4/3 for a 1920 layout), the prototype captured at 2x (`record.mjs --scale 2`) and downscaled with lanczos by `compose.py`, never a 1080p capture scaled up.
- **Desktop and phone in parallel**, on two virtual displays, on the same clock.
- **Record per segment inside each case** (search, results, cart), keeping the encoded segments. A prototype change re-records only the affected segment.
- **Fix sync in the edit.** When an action lands late, insert a room-tone pause in the audio before the sentence and a freeze of the same length in the video right after the action. Do not re-record for this.
- **Assemble from parts** encoded separately and joined without re-encoding. Never one huge filter graph.
- **Encoding:** fast for reviews (`compose.py` defaults); the final export is x264 `--preset slow --crf 16`, and the slide clips use the same settings.
- **Audio-only changes** replace only the audio track of an assembled video.

## Verification

- One frame per spoken line, on contact sheets, checked against the storyboard before delivery.
- Check that the video moves: frames from different seconds of a prototype segment must differ (pointer in a new place, text typed, page changed). A segment where frames repeat is a slideshow.
- Probes in the page during capture (e.g. log every 50 ms whether any hover button is visible), to prove what the eye cannot see in thumbnails.
- Look at the contact sheet of every clip before delivering it, never only at a sample, and check on it: the hand over clickable elements on desktop, no hover on the phone, no prototype tools on screen, both sides making the same choices and ending on the same action.
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
