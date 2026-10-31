---
name: product-presentation
description: Plans and produces presentations of a product or prototype, from the script to the final delivery, including narrated demo videos that combine slides, desktop and phone screen recordings, and a voice-over recorded by the presenter. Use when asked to create, review, or re-cut a product presentation or demo video, write a presentation script, build a storyboard, generate a teleprompter, or treat and sync a recorded narration with prototype screens.
license: MIT
metadata:
  version: "0.2.0"
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
5. For a recorded delivery, follow [references/recorded-delivery.md](references/recorded-delivery.md): record the narration, treat and cut the audio, capture and assemble, verify, export.

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

## Working mode

- **Project guidelines as the fixed reference:**
  - read them before every round and include them in the instructions of whoever executes;
  - update them on every new direction;
  - record the rule, not the reasoning behind it.
- **Screenshots** of what is ready, so the requester validates with their own eyes.
- **Questions** with full context and a recommendation. For visual decisions, an experiment with the options side by side.
- **Automatic meeting transcripts** do not attribute speakers reliably. Do not attribute points to people based on them.
