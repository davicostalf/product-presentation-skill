#!/usr/bin/env python3
"""cut_audio.py - remove ranges from a narration, cutting at energy minima with short fades.

Cutting inside a word leaves clicks and word fragments. Each cut boundary is moved to the quietest
10 ms frame within +-120 ms (a pause between words), and every kept piece gets an 8 ms fade in and
out, so joins are inaudible. Cuts shorter than 0.2 s are not moved (they are already inside a gap).

Inputs
  audio    any file ffmpeg reads (use the treated WAV from treat_audio.sh)
  cuts     JSON list of [start, end] ranges to REMOVE, in source seconds: [[0, 9.1], [117.4, 120.45]]
           (a range starting at 0 removes the false start; the file end is kept)

Outputs
  --out cut.wav        the cut audio (48 kHz mono 16-bit)
  --map map.json       [{"src": [a, b], "dst": t}, ...]: the kept pieces and where each lands in the
                       cut audio. Use it to remap anything timed on the source (cue times, words).
  --remap in.json out.json   remap a word-timestamp list through the map (words inside removed
                       ranges are dropped). Normally you re-transcribe the cut file instead; use
                       this to avoid re-running the transcription.

After cutting, transcribe the CUT file and check that no word fragment is left at any join.
To splice a re-recorded sentence: treat it the same way, cut the take at energy minima, join it where
the old sentence was, transcribe only the new piece and remap the timings of what comes after.

Usage
  python3 cut_audio.py treated.wav cuts.json --out cut.wav --map map.json
  python3 cut_audio.py treated.wav cuts.json --out cut.wav --map map.json --remap words.json words-cut.json

Dependencies: Python 3.9+, numpy, ffmpeg.
"""
import argparse
import json
import shutil
import subprocess
import sys

import numpy as np

SR = 48000


def load(path):
    p = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                       capture_output=True)
    if p.returncode or not p.stdout:
        sys.exit("cut_audio.py: could not decode %s: %s" % (path, p.stderr.decode()[-300:]))
    return np.frombuffer(p.stdout, dtype=np.float32).astype(np.float64)


def minima(x, t, win=0.12):
    """Time of the lowest-energy 10 ms frame within +-win seconds of t."""
    a = max(int((t - win) * SR), 0)
    b = min(int((t + win) * SR), len(x))
    seg = x[a:b]
    f = int(0.01 * SR)
    if len(seg) <= f:
        return t
    step = f // 2
    e = [np.sqrt(np.mean(seg[i:i + f] ** 2)) for i in range(0, len(seg) - f, step)]
    return (a + int(np.argmin(e)) * step + step) / SR


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("audio")
    ap.add_argument("cuts")
    ap.add_argument("--out", required=True)
    ap.add_argument("--map", default=None)
    ap.add_argument("--remap", nargs=2, metavar=("IN", "OUT"))
    ap.add_argument("--window", type=float, default=0.12, help="search window in seconds (default 0.12)")
    ap.add_argument("--fade", type=float, default=0.008, help="fade length in seconds (default 0.008)")
    a = ap.parse_args()
    if not shutil.which("ffmpeg"):
        sys.exit("cut_audio.py: ffmpeg not found (apt-get install -y ffmpeg)")

    x = load(a.audio)
    dur = len(x) / SR
    cuts = sorted((float(s), float(e)) for s, e in json.load(open(a.cuts)))
    keep, t = [], 0.0
    for s, e in cuts:
        if e <= s or s >= dur:
            continue
        move = (e - s) > 0.2
        s2 = minima(x, s, a.window) if (move and s > 0) else s
        e2 = minima(x, e, a.window) if (move and e < dur) else e
        if s2 > t:
            keep.append((t, s2))
        t = max(t, e2)
    if t < dur:
        keep.append((t, dur))

    fade = int(a.fade * SR)
    pieces, mp, pos = [], [], 0.0
    for s, e in keep:
        seg = x[int(s * SR):int(e * SR)].copy()
        if len(seg) > 2 * fade:
            seg[:fade] *= np.linspace(0, 1, fade)
            seg[-fade:] *= np.linspace(1, 0, fade)
        mp.append({"src": [round(s, 3), round(e, 3)], "dst": round(pos, 3)})
        pos += len(seg) / SR
        pieces.append(seg)
    y = np.concatenate(pieces)
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                        "-c:a", "pcm_s16le", a.out], input=y.astype(np.float32).tobytes(), capture_output=True)
    if r.returncode:
        sys.exit("cut_audio.py: ffmpeg failed: " + r.stderr.decode()[-300:])
    if a.map:
        json.dump(mp, open(a.map, "w"), indent=1)
    if a.remap:
        words = json.load(open(a.remap[0]))
        out = []
        for w in words:
            for m in mp:
                s, e = m["src"]
                if s <= w["start"] < e:
                    w2 = dict(w)
                    w2["start"] = round(m["dst"] + w["start"] - s, 3)
                    w2["end"] = round(m["dst"] + min(w["end"], e) - s, 3)
                    out.append(w2)
                    break
        json.dump(out, open(a.remap[1], "w"), indent=1, ensure_ascii=False)
    print("cut %s: %.2fs -> %.2fs (%d pieces)" % (a.out, dur, len(y) / SR, len(keep)))


if __name__ == "__main__":
    main()
