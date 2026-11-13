---
name: product-presentation
description: Plans and produces presentations of a product or prototype, from the script to the final delivery, including narrated demo videos that combine slides, continuous desktop and phone screen video of the live prototype, and a voice-over recorded by the presenter. Use when asked to create, review, or re-cut a product presentation or demo video, write a presentation script, build a storyboard, generate a teleprompter, or treat and sync a recorded narration with prototype screens.
license: MIT
metadata:
  version: "0.4.1"
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

## Where to run

Run the recorded pipeline in an isolated Linux environment, never on the presenter's own computer:

- **Preferred:** a remote Claude Code session (Claude Code on the web, or any cloud session), with the prototype repository attached. The person follows from the app and receives the files there.
- **Also fine:** a Linux container or VM with at least 4 CPUs and 8 GB of RAM.

The pipeline runs two browsers on virtual displays, screen encoders at high resolution and, for transcription, a speech model on the CPU. On a laptop this saturates the machine and can freeze it, and on macOS or Windows the virtual display and screen grabber (Xvfb, x11grab) do not exist. `scripts/check_env.sh` refuses to continue outside Linux and warns on low resources; if it does, tell the user to open a remote session instead of working around it.

Planning steps (type, script, slides, storyboard) can run anywhere.

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
- **Write for the ear, not the page.** The viewer hears each sentence once while looking at something else. Prefer the noun to the pronoun, name what "the two" or "this" refers to, say where to look before what is there, and keep the connectors explicit. A few more words are fine when they save the listener from reconstructing the sentence; filler is not.
- **Narrate an action in the order it happens on screen**, with the verb of what the person does: first where they go, then what they ask for or click ("the merchant opens the metric menu and asks to analyze the CTR"). Never compress a step into an adverbial ("analyzes the CTR straight from the metric menu").
- **Who acts comes before what happens.** Subject and action verb first; no passive voice and no verb turned into a noun ("the merchant creates the task", not "the task creation is done"). An opening time clause is fine when it names who acts ("when the merchant opens the finding, they see…"); an impersonal one is not ("on opening the finding, …").
- **No preamble before the content** ("the title says it all:", "it's worth noting that", "the interesting part is").
- **One action per clause, in sequence**, joined by "and" or "then", never one nested inside another.
- **What is already on screen comes before what is new.** The sentence starts on the element the viewer just saw and ends on the new information.
- **Explain every new term the first time it is said.** A word the audience has not heard before, or one used with a specific meaning in this proposal (a new concept, a renamed action, a label invented for the product), gets a one-sentence definition right after it, in plain words, before the video relies on it.
- **No colons in narration.** A colon is a written pause; spoken, it either disappears or sounds like reading. Join with "and", "that", "because", or split into two sentences.
- **Natural connectors** between ideas, so nothing sounds cut off.
- **Claim only what the screen shows** and what has been checked. Every action shown is spoken, and everything spoken appears.
- **One sentence per screen segment.** A sentence spoken over a cover ends on the cover; the next screen starts with a new sentence.
- **Language:** in a non-English video, use the local word when it is common (in Portuguese, "usuário", not "user"; "carrinho", not "cart"). Terms with no usual equivalent stay in the original.
- **People's names** without an article when the language would add one (Portuguese: "Ana", not "a Ana").
- **Neutral words for neutral ideas**, and no exaggeration.
- **After recording**, bring back into the script what the presenter improved while speaking.
- **Chapter titles, captions and on-screen descriptions** describe only what the screen shows, in the domain's words ("technical specifications", not "specs sheet"), and never narrate the pointer ("the cursor moves over…").

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
  - takes the shape the page would show under it: the hand over a clickable element, the I-beam over a text field, the arrow elsewhere (`cursor.js` reads the element's computed `cursor`);
  - glides, never jumps;
  - to point at something, rests near it, never on top of an element with a hover action;
  - paths go around such elements;
  - on the phone, a touch dot;
  - rests fully inside the screen, clear of the edges (pointer radius plus 8 px), the rounded corners and the safe areas.
- No conspicuous focus ring, tooltip or hover state that is not part of the narration.
- **On the phone, touch only.** No hover state ever shows: a tap presses (`:active`), nothing else. `record.mjs --mode phone` strips the prototype's `:hover` rules.
- **Reading beats.** On a screen dense with information (a product page, a confirmation with suggestions), the pointer passes over each piece the viewer should notice (the price, the delivery, each suggestion) and rests a beat on it, as someone reading would. Scroll the phone far enough to show it.
- **Desktop and phone mirror each other.** Both make the same choices (the same product, the same answer) and end on the same action; neither does a step the other skips.

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
7. **The prototype's own tools never show.** A state panel, a debug or settings button, a native tooltip from the capture's own markup: hide them with `record.mjs --hide '<selectors>'`.
8. **Words never come before the screen** and the prototype never acts while an attachment preview is up (see Sync and pacing).

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

## What the prototype needs before capture

Fix these in the prototype, not in the edit:

- **A solid band under the phone's status area**, as an installed web app has, so content scrolls beneath it instead of under the clock and battery.
- **Visible in-between states.** Loading, applying a filter, an agent typing: each shows a brief, readable state (a progress line, dimmed results, a typing indicator). A screen that swaps instantly reads as a cut in the video.

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
- **Arrow over a button:** the desktop pointer never turning into the hand over clickable elements.
- **Hover on the phone:** a hover highlight or a hovering pointer on a touch screen.
- **Tools on screen:** the prototype's state panel or debug button recorded with the product.
- **Skimming dense screens:** the pointer rushing past prices and details instead of reading them.
- **Mismatched sides:** desktop picks one thing and the phone another, or one side does an extra step.
- **Silent fallback:** capture tooling missing and the video built from stills anyway. Stop and report instead.

## Working mode

- **Project guidelines as the fixed reference:**
  - read them before every round and include them in the instructions of whoever executes;
  - update them on every new direction;
  - record the rule, not the reasoning behind it.
- **Screenshots** of what is ready, so the requester validates with their own eyes.
- **Questions** with full context and a recommendation. For visual decisions, an experiment with the options side by side.
- **Automatic meeting transcripts** do not attribute speakers reliably. Do not attribute points to people based on them.
