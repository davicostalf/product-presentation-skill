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
- **Check the environment first:** `scripts/check_env.sh`. Missing Xvfb, Chromium/Playwright or ffmpeg means stop and tell the user.
- **Pointer:** injected by `scripts/cursor.js` (headless and scripted browsers draw none). Arrow on desktop, translucent dot on phone, eased glides, press animation, resting near targets and never on hover-action elements.
- **Pipeline, per case:**
  1. Cues: `scripts/transcribe.py` on the cut narration, then `scripts/cues.py` with named phrases. Use `--advance` so the screen shows the thing 0.3-0.8 s before the words.
  2. Scenario: copy `scripts/scenario-example.mjs`, adapt selectors and text. The scenario acts on cues: pointer moves before the cue, the press lands on it, it waits for loading to finish.
  3. Record: `scripts/run_pair.sh scenario.mjs URL out cues.json` (desktop and phone in parallel) or `scripts/record.mjs` for one clip. Each clip starts with a red marker that fixes time zero.
  4. Compose: `scripts/compose.py --desktop ... --phone ... --out ... --height 1440` (or 1080).
- **Composition:** flat `#F2F3F5` background, desktop left and phone right with a rounded phone frame, no cards, borders or shadows. 1920x1080: desktop 1336x835 at (50, 122), phone 415x900 at (1441, 90). 2560x1440: desktop 1781x1113 at (67, 163), phone 553x1200 at (1921, 120). Target look: `assets/reference-frame.png`.
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
