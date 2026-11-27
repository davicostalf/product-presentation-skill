# Review checklist

The final pass before handing a recorded video off. Watch the whole video at 1x with sound, then again as a frame every second (`ffmpeg -i video.mp4 -vf fps=1 frames/%04d.png`), and tick each item. A contact sheet of line starts is not enough: most of these problems happen between line starts. Fix at the root (slide, prototype, take) and review again.

## Contents

- Contrast
- Fidelity to the prototype
- Pointer and touch
- Overlays
- Text wrapping
- Sync
- Phone and desktop
- Narration
- Loudness

## Contrast

- [ ] Every data mark and meaningful shape (bar, line, icon, chart segment, scale step) is at least 3:1 against its surface, measured on a rendered frame: `python3 scripts/check_contrast.py frame.png --mark X,Y --surface X,Y`.
- [ ] The light end of every scale was checked, not only the dark end.
- [ ] Text is at least 4.5:1 (3:1 for large text), also on translucent surfaces: `--min 4.5`.

## Fidelity to the prototype

- [ ] Each slide illustration of the product was compared side by side with the prototype at the same scale: same shapes, borders, icons, alignment (a bottom-aligned button stays bottom-aligned), colors and copy.
- [ ] Illustrations come from the prototype's components, CSS or screenshots, none redrawn from memory.
- [ ] No slide shows the interface as it was before a prototype change.

## Pointer and touch

- [ ] One pointer vocabulary across the whole video: slides use the same `cursor.js` arrow and touch dot as the captures.
- [ ] Desktop: the hand over clickable elements, the I-beam over fields. Phone: touch dot only, no hover state.
- [ ] The pointer rests clear of hover reveals, the screen edges and the safe areas; no stray tooltip or focus ring.

## Overlays

- [ ] While an attachment preview or any overlay is up, nothing changes behind it: no typing, scrolling, loading or clicks on either screen.
- [ ] Actions happen before the overlay appears or after it lifts.

## Text wrapping

- [ ] No line of slide text ends with a single word, in every build state of the slide (check each frame in which text changes).
- [ ] Body text uses `text-wrap: pretty`, titles `text-wrap: balance`.

## Sync

- [ ] Each action lands within 0.3 s after the word that names it, never before the word, never later than a beat.
- [ ] Nothing a line describes disappears from the screen while it is being spoken.
- [ ] No screen moves on before its line ends; the change starts about 0.3 s after the last word.
- [ ] A slide's illustration is complete within about 1 s; nothing is held back for a distant word.
- [ ] Nothing stays on screen for less than 3 s; a 2 to 3 s pause sits between a line and a slide or section change.

## Phone and desktop

- [ ] Both sides make the same choices and end on the same action, neither does an extra step.
- [ ] Both react at the same moment; their loading states and results line up with the narration.

## Narration

- [ ] Run `python3 scripts/split_lines.py narration.wav words.json script.json outdir/ --report-only` and read every REPEAT, RESTART and LONG SILENCE entry; listen to each timestamp and cut by hand with `cut_audio.py` or re-record.
- [ ] No false start, restarted phrase or stumble is left in the take, including one whose words differ slightly the second time.
- [ ] No silence longer than about 1.5 s inside a line.
- [ ] Words the transcript got wrong were checked by ear where a recorder or a cue depends on them (a cue fired by a mis-transcribed word lands in the wrong place).
- [ ] The spoken words match the script, or the script was updated to match.

## Loudness

- [ ] The final mix is at the target loudness (about -16 LUFS integrated, true peak under -1.5 dBTP) with `treat_audio.sh`, and lines are even in level from start to end.
- [ ] No clipping, no pumping from the treatment, no breaths or clicks at the cuts.
