# Ideas

Proposals under consideration. Nothing here is a commitment: an approved idea becomes a change to the skill and an entry in the changelog.

## Structure

- **Product presentation at the center, recording as a delivery mode.** Organize as presentation (types, script, slides, prototype demo), rehearsal (storyboard) and delivery, live or recorded. The live mode would cover presenter notes, screen order and the prototype prepared in each state.

## New types

- **Conceptual flow or journey presentation.** No working prototype: the flow or journey told in steps, with diagrams or static screens.
- **Landing page video.** 30–90 seconds, no presenter or recipient; opens with the benefit, captions for watching without sound, a closing call to action; usually no context slides.

## Before the script

- **Initial interview.** Gather goal, audience, key points and data before picking the type and writing. Source: freeCodeCamp article on Claude Code + Marp.
- **3–4 key messages.** Define what the audience should remember, test the script against them and repeat them in the closing. Sources: Y Combinator Demo Day guide; Duarte (Resonate).

## Script

- **Word budget per segment.** At ~120 words per minute, compute how much fits in each block and check the script against the type's target length. Source: `catalan-adobe/skills` (demo-narrate).
- **Coverage derived from changes.** When the demo shows a round of changes, list what changed (diff or product changelog) and make sure each item appears in the script. Source: `jaobrown/demo-changes`.

## Slides

- **Layered verification.** Leftover placeholder text (lorem, TODO), a valid file, and visual inspection of every slide, with a list of design anti-patterns (decorative line under the title, centered text, repeated identical layouts, overflowing text). Source: Anthropic's `pptx` skill.

## Recording and assembly

- **Silent dry run of the capture.** Run the whole capture before the final assembly to validate actions and timings. Source: `tomek-i/narrate-plugin`.
- **Clean captures of key states.** Export frames without pointer or captions, for documentation and slides. Source: `Avatechdir/video-walkthrough-skill`.

## Skill quality

- **Evaluations.** At least three test scenarios run with the models the skill targets, before expanding the instructions.

## Pending benchmark

- Read the full SKILL.md of `presentation-builder`, `web-video-presentation`, `ted-talk`, `demo-narrate` and `narrate-plugin`.
- Look at commercial demo tools (Arcade, Supademo, Tella, Descript) and equivalents in other agents (Cursor, Codex).
