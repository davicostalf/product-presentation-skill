# Changelog

Notable changes to the skill. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/).

## [0.6.0] - 2026-11-27

From a narrated video whose problems showed only when watching the final result: a gray data bar lost against the background, slide drawings that drifted from the prototype, a different cursor on a slide, actions under an attachment preview, a narration false start left in, illustrations held back for distant words, and single-word last lines.

### Added

- `references/review-checklist.md`: the final-pass checklist (contrast, fidelity to the prototype, pointer and touch, overlays, text wrapping, sync, phone and desktop, narration, loudness), linked from SKILL.md and from the verification section of `recorded-delivery.md`.
- `scripts/check_contrast.py`: contrast ratio between two colors or two points of a rendered frame; flags anything under 3:1 (`--min` for text) and exits 1, so it can gate a script. Has `--self-test`.
- `scripts/split_lines.py`: RESTART detection (near-duplicate word n-grams of 3 to 5, compared with difflib on normalized words, second occurrence within 8 s of the first, so "que parece em" then "que aparece em" is found) and LONG SILENCE detection (over 1.5 s between two words of the same line). Both are in `report.json` and the printed report with timestamps; the take is still never edited. Options `--restart-window`, `--restart-sim`, `--silence`, and `--self-test` with synthetic word lists.
- Rules in SKILL.md: contrast for data marks (3:1, checked on the rendered frame), illustrations from the prototype and compared side by side, one pointer vocabulary, frozen under overlays, no single-word last lines, short entrances, and a "Watch before handing off" section.
- Common mistakes for each new rule.

### Changed

- "Slide elements" in Sync and pacing: the illustration is complete within about 1 s; it used to say elements tied to the narration enter on the word that names them.
- "Illustrations follow the prototype" in Slides is now "Illustrations come from the prototype" and covers drawings made from memory.
- The attachment rule now states the general one: screens behind any overlay are frozen.

## [0.5.0] - 2026-11-24

### Added

- `scripts/teleprompter.py` and `assets/teleprompter.html`: the teleprompter page, built from the script (project shape or a plain list of `{head, lines}`). Pace and Voice modes; voice following matches the last ~6 recognized words against a forward window, widens it after ~4 s without a match, restarts recognition on end and after ~8 s of silence, retries on network errors and explains mic and network problems; countdown, wake lock, size, mirror, section pause. `--lang` sets the interface labels and the recognition language, `--ui` overrides labels.
- `scripts/split_lines.py`: splits one continuous narration take into one file per script line, cutting each boundary at the centre of the longest silence, and reports tight boundaries, deviations from the script and repeated words (it never edits the take).
- `scripts/render_slide_video.mjs`: renders an animated slide as video with deterministic frame capture on the absolute video clock, low-rate capture of slow motion, 30 fps output.
- Rules in SKILL.md: the screen never moves on before the line ends; multi-step actions land on the words that name each step; realistic processing time; scroll targets clear sticky headers and their fades; the pointer path avoids hover reveals and no tooltip shows over a popover; slide illustrations follow the prototype; a "Slides" section with finish rules (one title size, optical centering, noise over soft gradients, whole pixels, contrast on translucent surfaces, solid floating menus); say what it does, not its technical name, in everything read or heard, with new terms explained on screen too; cut to the time budget by tightening, not by removing ideas.
- `references/recorded-delivery.md`: sections "Teleprompter" (script shape, serving over `http://localhost` in Chrome or Edge), "One take, many lines" and "Animated slides as video"; asking for the lossless original recording (float originals recover peaks above 0 dBFS; check whether two takes are the same take by cross-correlation).
- Common mistakes for each new rule.

### Changed

- Final export is one recommendation, x264 `--preset slow --crf 16` (it was `--crf 17 --preset medium`), also used by the slide clips; `compose.py` documents it.
- Final resolution end to end: for 1440p, slides render at 1440p (device scale factor 4/3 for a 1920 layout) and the prototype is captured at 2x and downscaled with lanczos.
- The rule "Explain every new term" now covers on-screen text, and the rule on resting on hover targets covers paths and tooltips.
- The teleprompter bullet in the recorded-delivery reference moved into its own section.

### Removed

- "Word budget per segment" from IDEAS.md (implemented as a script rule).

## [0.4.1] - 2026-11-12

### Added

- Script rules for narration that is heard, not read: write for the ear (nouns over pronouns, named referents, where to look first, explicit connectors), narrate an action in the order it happens, who acts before what happens, no preamble, one action per clause, known before new, no colons, and a one-sentence definition for every new term the first time it is said.

## [0.4.0] - 2026-11-12

### Added

- `cursor.js`: on desktop the pointer takes the shape the page would show under it (the hand over clickable elements, the I-beam over text fields, the arrow elsewhere).
- `record.mjs --hide SELECTORS`: hides the prototype's own tools (a state panel, a debug button) in every frame during capture.
- `record.mjs --mode phone` strips the prototype's `:hover` rules, so a tap never leaves a hover highlight.
- Rules in SKILL.md: pointer shape, touch only on the phone, reading beats on dense screens, desktop and phone mirroring each other, the prototype's tools never on screen, chapter and caption texts that describe only what is shown and never the pointer.
- "What the prototype needs before capture": a solid band under the phone's status area, and visible in-between states (loading, applying, typing).
- Verification: the contact sheet of every clip, with the new checks.

### Fixed

- The phone host page's iframe had `title="prototype"`, which showed as a native tooltip over the phone screen when the pointer rested on it. It is now an `aria-label`.

## [0.3.2] - 2026-11-04

### Added

- "Where to run" section: the recorded pipeline runs in a remote Claude Code session or a Linux container/VM, never on the presenter's computer.
- `check_env.sh` refuses non-Linux machines and warns below 4 CPUs or 8 GB of RAM.

## [0.3.1] - 2026-11-03

### Changed

- Phone capture is a 390x844 iframe host: `record.mjs --mode phone` embeds the prototype in an iframe of 390x844 CSS px (configurable with `--device`), centered on a flat background in a window of at least 500 px, and records exactly the iframe rect. The prototype now lays out at a real phone width instead of the 500 px Chromium minimum that was downscaled. The touch dot is injected into the iframe (`cursor.js` option `where: 'frames'`).
- Scenario contract: `ctx.open(url)` opens the prototype and `ctx.app` (the page on desktop, a frame locator on the phone) locates elements; `scenario-example.mjs` and the docs are updated. `ctx.device` gives the iframe rect.
- `compose.py` phone slot is 416x900 at (1440, 90) at 1080p and 555x1200 at (1920, 120) at 1440p (the 390:844 aspect), scaled whole without cropping; corner radius 47 (63) px.
- `cursor.js`: `park()` and `pointTo({ near })` clamp the resting position inside the screen (pointer radius + 8 px margin; on the phone also clear of the rounded corners and safe-area bands), so the pointer never rests half outside the screen. Clicks are not clamped.
- `assets/reference-frame.png` regenerated from the new capture.

### Added

- Safe-area insets: the host page sets 47 px top, 34 px bottom and a 44 px corner radius, exposed as `--safe-area-inset-*` and `--safe-area-corner-radius` custom properties and through `env(safe-area-inset-*)` emulation, with a fake status bar and home indicator (`--safe-top`, `--safe-bottom`, `--safe-radius`, `--no-status-bar`).
- Safe-area check: `record.mjs` logs `SAFE-AREA` warnings for interactive elements that touch the rounded corners or the top and bottom bands (`--no-safe-check` to skip).
- SKILL.md rules on phone width and phone safe areas; `assets/placeholder-store.html` honors the safe areas.

## [0.3.0] - 2026-11-03

### Fixed

- Videos made of static screenshots, with no visible cursor and the screens inside a decorated box with a drop shadow. The skill now states the capture and composition rules explicitly and ships the scripts to follow them.

### Added

- `scripts/`: `check_env.sh`, `cursor.js` (injected pointer), `record.mjs` and `run_pair.sh` (real capture on Xvfb + Chromium + ffmpeg, desktop and phone in parallel), `compose.py` (fixed side-by-side composition at 1080p and 1440p), `scenario-example.mjs` and `scenario-slide-example.mjs`, `transcribe.py`, `cues.py`, `treat_audio.sh`, `cut_audio.py`.
- `assets/reference-frame.png` (target composition) and `assets/placeholder-store.html` with example cue files.
- Capture and composition rules in SKILL.md and `references/recorded-delivery.md`: continuous video of the live interaction, injected pointer, flat background with no boxes or shadows, exact proportions, stop when the environment cannot capture.
- "Common mistakes" list.
- GitHub Action that validates every skill against the Agent Skills specification on each push and pull request.

### Changed

- `metadata.version` and the plugin manifest are 0.3.0.

## [0.2.0] - 2026-10-31

### Changed

- Skill renamed to `product-presentation` and translated to English.
- Layout follows the Agent Skills specification: frontmatter with `name`, `description`, `license` and `metadata`; detailed material moved to `references/presentation-types.md` and `references/recorded-delivery.md`.

### Added

- Claude Code plugin marketplace manifest (`.claude-plugin/marketplace.json`).
- MIT license.

## [0.1.0] - 2026-10-31

### Added

- First version of the skill (in Portuguese): artifacts, workflow, "product proposal for leadership" type, script rules, storyboard, narration recording, audio treatment, sync and pacing, capture and assembly, verification and working mode.
