# Recorded delivery

How to turn an approved storyboard into a narrated video.

## Contents

- Recording the narration
- Audio treatment
- Capture and assembly
- Verification
- Reference timings

## Recording the narration

- **Teleprompter** generated from the script, one sentence highlighted at a time, sections marked.
  - Default pace around 120 words per minute, adjustable while reading.
  - Serve the voice-following mode from `http://localhost`: opened as `file://`, the browser asks for the microphone on every restart of recognition.
- Record everything in one file, with about 2 s of silence between sections.
- To replace a sentence later, re-record only it, in the same place and with the same microphone.

## Audio treatment

- **Light treatment that preserves the voice:** high-pass, click removal, gentle noise reduction, peak repair, subtle EQ, light compression, loudness normalization. Do not change pitch or speed.
- **Cuts** at energy minima, with a short fade. After cutting, re-transcribe the region and check that no word fragment is left.
- **Remove** false starts, repetitions and long silences. Keep breaths and natural pauses.
- **Splicing a re-recorded sentence:** apply the same treatment, splice at energy minima, transcribe only the new segment and remap the timings of the rest.
- **Extra pauses** (for loading, an attachment or a section change) are made with room tone taken from silent stretches of the same recording.

## Capture and assembly

- **Capture:** a real browser on a virtual display (e.g. Xvfb + Chromium + ffmpeg), scripted (e.g. Playwright) and driven by the word timings of the narration.
- **Record once, at the final resolution** (e.g. 1440p). Smaller versions are downscaled from the same material.
- **Desktop and phone in parallel**, on two virtual displays, on the same clock.
- **Record per segment inside each case** (search, results, cart), keeping the encoded segments. A prototype change re-records only the affected segment.
- **Fix sync in the edit.** When an action lands late, insert a room-tone pause in the audio before the sentence and a freeze of the same length in the video right after the action. Do not re-record for this.
- **Record slides live** so animations play, each animation triggered by the narration word.
- **Assemble from parts** encoded separately and joined without re-encoding. Never one huge filter graph.
- **Encoding:** fast for reviews; high quality only for the final export.
- **Audio-only changes** replace only the audio track of an assembled video.

## Verification

- One frame per spoken line, on contact sheets, checked against the storyboard before delivery.
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
