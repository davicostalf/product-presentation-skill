---
name: product-presentation
description: Plans and produces presentations of a product or prototype, from the script to the final delivery, including narrated demo videos that combine slides, continuous desktop and phone screen video of the live prototype, and a voice-over recorded by the presenter. Use when asked to create, review, or re-cut a product presentation or demo video, write a presentation script, build a storyboard, generate a teleprompter, or treat and sync a recorded narration with prototype screens.
license: MIT
metadata:
  version: "0.3.1"
---

# Product presentation

A product presentation shows something built in a prototype: slides for what is not screen, and recordings of the prototype, desktop and phone side by side, for what is experience. When the presentation is recorded, the presenter records their own voice and the video is assembled around it.

Terms:
- **Script:** the text to be spoken, split into sections and lines.
- **Narration:** the recording of the voice reading the script.

## Artifacts

Each artifact has a single source; the others derive from it.

| Artifact | Source | Purpose |
|---|---|---|
| Script | one text file by sections (e.g. `script.json`) | generates the teleprompter, the slide notes and the storyboard lines |
| Slides | one HTML file per slide, animations declared | blocks that are not prototype |
| Storyboard | generated from the script + captures | review: one screen per spoken line, with the exact line under it |
| Teleprompter | generated from the script | recording the narration |
| Narration | the presenter's recording, treated and cut | timing base of the video |
| Project guidelines | a living file with the requester's decisions | reference for every round |
| Video | assembly of slides, captures and narration | delivery |

## Workflow

1. Pick the **presentation type**. See [references/presentation-types.md](references/presentation-types.md).
2. Write the **script** in the type's format, following the script rules below.
3. Prepare **slides** and the **prototype** for each line.
4. Build the **storyboard** and iterate until approved.
5. For a recorded delivery, follow [references/recorded-delivery.md](references/recorded-delivery.md): record the narration, treat and cut the audio, capture and assemble, verify, export. Capture the prototype with the scripts in `scripts/` and obey [Prototype capture rules](#prototype-capture-rules).

Iterate on the storyboard, not on the video: changing text, screens or order there costs minutes. Record the narration only after the storyboard is approved, so a script change never forces a re-recording.

## Script rules

These apply to every type:

- **Write to be spoken.** It sounds like the presenter improvising, never like polished prose. Avoid:
  - hooks, punchlines and landing-page phrases;
  - "to sum up" and forced enumerations;
  - sentences with a parenthetical pause in the middle.

  Put the main clause first and the explanation after it.
- **Natural connectors** between ideas, so nothing sounds cut off.
- **Claim only what the screen shows** and what has been checked. Every action shown is spoken, and everything spoken appears.
- **One sentence per screen segment.** A sentence spoken over a cover ends on the cover; the next screen starts with a new sentence.
- **Language:** in a non-English video, use the local word when it is common (in Portuguese, "usuário", not "user"; "carrinho", not "cart"). Terms with no usual equivalent stay in the original.
- **People's names** without an article when the language would add one (Portuguese: "Ana", not "a Ana").
- **Neutral words for neutral ideas**, and no exaggeration.
- **After recording**, bring back into the script what the presenter improved while speaking.

## Storyboard

- One frame per spoken line (a sentence or part of one), with the exact line under it and a label describing the screen.
- Desktop and phone side by side in prototype frames.
- Animated slides get one frame per animation state, on the line where that state enters.
- Automatic check: the text of all frames, concatenated, equals the script.
- Images embedded, in a single file that opens offline.

## Sync and pacing

These apply to the storyboard and to any recorded or rehearsed delivery.

- **The screen shows the thing 0.3–0.8 s before the words name it.** Never during, never after, never while the page is still loading.
- **Between the end of a line and a slide or section change, a 2–3 s pause.** The change never happens mid-sentence.
- Nothing stays on screen for less than 3 s.
- **Slide elements:** those not tied to the narration are already on screen when the slide appears; those tied to it enter on the word that names them.
- With a field filled in, a short pause before submitting.
- **Attachments** (photo, document) appear once, centered over both screens blurred and frozen. The prototype acts only after the attachment leaves. The image is the same one shown in the field and in the result.
- **Pointer:**
  - glides, never jumps;
  - to point at something, rests near it, never on top of an element with a hover action;
  - paths go around such elements;
  - on the phone, a touch dot.
- No conspicuous focus ring, tooltip or hover state that is not part of the narration.

## Prototype capture rules

Non-negotiable for every video that shows a prototype. Use the scripts; do not improvise a capture pipeline.

1. **Continuous video of the real interaction.** The prototype segments are screen video of the live prototype running: typing, clicks, scrolls, page transitions, loading states, all happening in real time. Never build them from screenshots or storyboard frames, and never as a slideshow or pan-and-zoom over stills. The storyboard's still frames are for review only.
2. **A visible pointer, injected into the page.** Scripted and headless browsers draw no cursor, and the screen grabber is run without one, so the pointer must be part of the page: `scripts/cursor.js` injects a small arrow on desktop and a translucent touch dot on the phone. It glides on eased curves (never jumps) and plays a press animation on every click. Point near a target, never resting on an element with a hover action.
3. **Fixed composition.** Flat light background (`#F2F3F5` by default). The desktop window and the phone frame sit side by side, vertically centered, filling most of the frame with even margins. The phone has a rounded device frame. **No** extra container, card, border or drop shadow around the screens, and no device mockup beyond the phone frame. Exact proportions:

   | Frame | Desktop window | Phone screen |
   |---|---|---|
   | 1920x1080 | 1336x835 at (50, 122) | 416x900 at (1440, 90) |
   | 2560x1440 | 1781x1113 at (67, 163) | 555x1200 at (1920, 120) |

   The phone slot has the aspect of a 390x844 CSS px screen, so the phone clip is scaled whole, never cropped or stretched. The phone screen's corner radius is 47 px at 1080p (63 at 1440p), the 44 px safe-area corner of the prototype. `scripts/compose.py` produces exactly this. The target look is [assets/reference-frame.png](assets/reference-frame.png), rendered from a neutral placeholder page: match it.
4. **The phone is a real phone width.** The phone take shows the prototype in an iframe of exactly 390x844 CSS px (configurable) inside a host page, so it lays out as on a real phone, not at the 500 px Chromium minimum window width. Only the iframe rect is captured. Scenarios drive the prototype through `ctx.app` (a frame locator on the phone), never through `page` (the host).
5. **Phone safe areas.** The composition rounds the phone screen's corners and draws a bezel, and real phones have a status area and a home indicator. On the phone, keep interactive elements and key content out of the rounded corners (44 px radius) and out of the top (47 px) and bottom (34 px) safe areas. The prototype should honor `env(safe-area-inset-top/bottom)` or the `--safe-area-inset-top` / `--safe-area-inset-bottom` custom properties that the host page sets. `scripts/record.mjs` logs a `SAFE-AREA` warning for every interactive element that touches those zones; fix the prototype (or the scenario) and record again.
6. **Stop if the environment cannot capture.** Run `scripts/check_env.sh` first. If a virtual display (Xvfb), Chromium with Playwright or ffmpeg is missing, stop and tell the user exactly what is missing and how to install it. Never fall back to stills silently, and never deliver a slideshow as if it were a demo.
7. **Words never come before the screen** and the prototype never acts while an attachment preview is up (see Sync and pacing).

| Script | Does |
|---|---|
| `scripts/check_env.sh` | verifies Xvfb, ffmpeg, Node, Playwright, Chromium, Pillow; lists what is missing |
| `scripts/cursor.js` | injectable pointer overlay (arrow, or touch dot inside the phone iframe) and a Node API: glide, click, type, scroll |
| `scripts/record.mjs` | records one scenario on Xvfb + headed Chromium + ffmpeg (`--mode desktop`, or `phone` through a 390x844 iframe host page with safe-area insets and a safe-area check) |
| `scripts/run_pair.sh` | records desktop and phone in parallel on the same clock |
| `scripts/compose.py` | cuts both clips at time zero and composes them on the flat background at 1080p or 1440p |
| `scripts/scenario-example.mjs` | cue-driven example scenario: open, glide, type, click, wait for load, scroll |
| `scripts/scenario-slide-example.mjs` | records an animated slide live |
| `scripts/transcribe.py` | word timestamps of the narration (faster-whisper) |
| `scripts/cues.py` | turns word timestamps and named phrases into the cue list that drives a scenario |
| `scripts/treat_audio.sh` | light voice treatment and loudness normalization |
| `scripts/cut_audio.py` | cuts at energy minima with short fades; remaps timings |

`assets/placeholder-store.html` is a neutral page to try the scripts on before touching the real prototype.

## Common mistakes

- **Stills instead of video:** screenshots strung together, with no transitions or loading states. Record the live interaction.
- **No cursor:** the pointer was never injected. Use `scripts/cursor.js`.
- **Phone at the wrong width:** the phone recorded as a 500 px window and downscaled. Use the iframe host that `record.mjs --mode phone` builds.
- **Content in the safe area:** a button under the status bar or in a rounded corner, cut by the phone frame. Heed the `SAFE-AREA` warnings.
- **Decorative frames:** a big box, card, border or drop shadow around the screens, or a device mockup. Flat background only.
- **Cursor jumping:** teleporting between targets instead of gliding, or no press animation on clicks.
- **Resting on hover targets:** the pointer parked on an element that reveals actions.
- **Acting while the attachment preview is up:** the prototype must wait until it leaves.
- **Words before the screen:** the sentence names something that is not visible yet.
- **Silent fallback:** capture tooling missing and the video built from stills anyway. Stop and report instead.

## Working mode

- **Project guidelines as the fixed reference:**
  - read them before every round and include them in the instructions of whoever executes;
  - update them on every new direction;
  - record the rule, not the reasoning behind it.
- **Screenshots** of what is ready, so the requester validates with their own eyes.
- **Questions** with full context and a recommendation. For visual decisions, an experiment with the options side by side.
- **Automatic meeting transcripts** do not attribute speakers reliably. Do not attribute points to people based on them.
