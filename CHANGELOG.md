# Changelog

Notable changes to the skill. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/).

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
