# Changelog

Notable changes to the skill. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/).

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
