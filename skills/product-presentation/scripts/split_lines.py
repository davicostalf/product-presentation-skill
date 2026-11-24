#!/usr/bin/env python3
"""split_lines.py - split ONE continuous narration take into one audio file per script line.

Use it when the presenter recorded the whole script in a single take instead of line by line. It aligns the
transcribed words to the script lines, then cuts each boundary at the centre of the longest silence between
the last word of line N and the first word of line N+1, with short fades, and reports what needs a human ear.
It reports; it never edits the take (no word is removed, repeated or inserted on its own).

How
  1. Script words and transcript words are normalized (case, accents, punctuation dropped) and aligned with
     difflib; the first and last matched word of each line place it in the transcript.
  2. Between the last matched word of line N-1 and the first matched word of line N there may be stray words
     (a hesitation, a word the transcript got wrong). Every gap between two consecutive words in that stretch is a
     candidate boundary; the one with the longest silence in the audio wins, so stray words stay with the line
     they belong to by timing, not by guess.
  3. In a candidate (from 0.1 s before the gap to 0.1 s after), the cut is the centre of the longest run of
     frames close to the quietest level (10 ms RMS, 30 ms smoothing; threshold = quietest + 4 dB, never above
     -75 dB unless the audio is never that quiet). Each piece gets an 8 ms fade in and out.

Inputs
  narration  the treated and cut narration (any file ffmpeg reads; use the audio that goes into the video)
  words.json word timestamps of THAT file: [{"word": "search", "start": 2.8, "end": 3.2}, ...] (transcribe.py)
  script     the script: {"sections": [{"lines": [{"text": "..."}]}]} or a list [{"head": "...", "lines": ["...", ...]}]

Outputs (outdir/)
  NN.wav          one file per line, in script order (00.wav, 01.wav, ...; 48 kHz mono 16-bit)
  boundaries.json {"cuts": [t1, t2, ...], "lines": [{"line": 0, "start": 0.0, "end": 23.8, "text": "..."}, ...]}
  report.json     the report below, machine-readable
Report (also printed)
  TIGHT       boundaries whose silence is shorter than --tight seconds (default 0.4): the cut is close to a
              word, so listen to both sides
  DEVIATION   per line, script words the presenter did not say (missing) and transcript words that are not in
              the script (inserted), with timestamps. Numbers and symbols often differ between the written
              and the spoken form; read the list before assuming a problem
  REPEAT      repeated words or phrases within 1.5 s (false starts, "the the", a restarted phrase), with
              timestamps, so the take can be cut by hand with cut_audio.py or re-recorded

Options
  --tight S     silence length under which a boundary is flagged (default 0.4)
  --trim PAD    keep PAD seconds of silence before the first word and after the last one (default: keep the
                file as is, from its start to its end)
  --fade S      fade length (default 0.008)
  --report-only print the report and the cut times without writing audio

Usage
  python3 split_lines.py narration.wav words.json script.json outdir/ [--tight 0.4] [--trim 0.3]

Dependencies: Python 3.9+, numpy, ffmpeg.
"""
import argparse
import difflib
import json
import os
import re
import shutil
import subprocess
import sys
import unicodedata

import numpy as np

SR = 48000
FR = int(0.01 * SR)


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^\w]", "", s).replace("_", "")


def script_lines(data):
    """Flat list of line texts, from either accepted shape."""
    secs = data["sections"] if isinstance(data, dict) else data
    out = []
    for s in secs:
        for ln in s.get("lines", []):
            t = ln if isinstance(ln, str) else ln.get("text", "")
            if t.strip():
                out.append(t.strip())
    if not out:
        sys.exit("split_lines.py: the script has no lines")
    return out


def load_audio(path):
    p = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                       capture_output=True)
    if p.returncode or not p.stdout:
        sys.exit("split_lines.py: could not decode %s: %s" % (path, p.stderr.decode()[-300:]))
    return np.frombuffer(p.stdout, dtype=np.float32).astype(np.float64)


def align(lines, words):
    """Returns (first, last, ops): transcript word index range per line, and the difflib opcodes with token maps."""
    sw, ln = [], []
    for i, t in enumerate(lines):
        for tok in t.split():
            n = norm(tok)
            if n:
                sw.append(n)
                ln.append(i)
    tw, tidx = [], []
    for i, w in enumerate(words):
        n = norm(w["word"])
        if n:
            tw.append(n)
            tidx.append(i)
    sm = difflib.SequenceMatcher(None, sw, tw, autojunk=False)
    first, last = {}, {}
    for a, b, size in sm.get_matching_blocks():
        for k in range(size):
            l = ln[a + k]
            first.setdefault(l, tidx[b + k])
            last[l] = tidx[b + k]
    missing = [i for i in range(len(lines)) if i not in first]
    if missing:
        sys.exit("split_lines.py: could not find lines %s in the transcript; check that words.json is of this "
                 "narration and that the script text matches what was said" % missing)
    return first, last, sm, sw, ln, tw, tidx


def smooth_db(x):
    n = len(x) // FR
    rms = np.sqrt((x[: n * FR].reshape(n, FR) ** 2).mean(axis=1))
    db = 20 * np.log10(rms + 1e-9)
    return np.convolve(db, np.ones(3) / 3, mode="same")


def cut_point(sm, words, k, nxt):
    """Centre of the longest silence between word k and word nxt: (time, silence length, quietest dB)."""
    prev_end, next_start = words[k]["end"], words[nxt]["start"]
    a = int(max(prev_end - 0.1, 0) * 100)
    if next_start - prev_end > 0.05:
        b = int(min(next_start + 0.1, len(sm) / 100) * 100)
    else:
        b = int(min(max(next_start, prev_end) + 0.25, len(sm) / 100) * 100)
    w = words[nxt]
    if w["end"] - w["start"] > 0.6:  # a stretched first word ("So..."): the cut may go into it
        b = int((w["end"] - 0.15) * 100)
    b = max(b, a + 2)
    seg = sm[a:b]
    thr = max(seg.min() + 4, -75)
    mask = seg <= thr
    best, i = (0, 0), 0
    while i < len(mask):
        if mask[i]:
            j = i
            while j < len(mask) and mask[j]:
                j += 1
            if j - i > best[1] - best[0]:
                best = (i, j)
            i = j
        else:
            i += 1
    return (a + (best[0] + best[1]) / 2) / 100, (best[1] - best[0]) / 100, float(seg.min())


def repeats(words, window=1.5):
    toks = [norm(w["word"]) for w in words]
    out, i, n = [], 0, len(words)
    while i < n - 1:
        done = False
        for size in (3, 2, 1):  # longest repeated phrase first
            if i + 2 * size <= n and toks[i] and toks[i:i + size] == toks[i + size:i + 2 * size]:
                if size == 1 and len(toks[i]) < 2:
                    continue
                if words[i + size]["start"] - words[i + size - 1]["end"] <= window:
                    out.append({"at": round(words[i]["start"], 2), "until": round(words[i + 2 * size - 1]["end"], 2),
                                "text": " ".join(w["word"] for w in words[i:i + 2 * size])})
                    i += 2 * size
                    done = True
                    break
        if not done:
            i += 1
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("narration")
    ap.add_argument("words")
    ap.add_argument("script")
    ap.add_argument("outdir")
    ap.add_argument("--tight", type=float, default=0.4)
    ap.add_argument("--trim", type=float, default=None)
    ap.add_argument("--fade", type=float, default=0.008)
    ap.add_argument("--report-only", action="store_true")
    a = ap.parse_args()
    if not shutil.which("ffmpeg"):
        sys.exit("split_lines.py: ffmpeg not found (apt-get install -y ffmpeg)")

    words = json.load(open(a.words, encoding="utf-8"))
    lines = script_lines(json.load(open(a.script, encoding="utf-8")))
    first, last, sm, sw, ln, tw, tidx = align(lines, words)
    x = load_audio(a.narration)
    dur = len(x) / SR
    db = smooth_db(x)

    cuts, tight = [], []
    for l in range(1, len(lines)):
        lo, hi = last[l - 1], first[l]
        # candidates: every gap between two consecutive words from the previous line's last anchor to this
        # line's first anchor; the winner has the longest silence in the audio (ties: the longer word gap)
        cands = [(j,) + cut_point(db, words, j, j + 1) for j in range(lo, hi)]
        k, t, run, level = max(cands, key=lambda c: (round(c[2], 2), words[c[0] + 1]["start"] - words[c[0]]["end"]))
        cuts.append(t)
        if run < a.tight:
            tight.append({"between": [l - 1, l], "at": round(t, 2), "silence": round(run, 2),
                          "words": "%s | %s" % (words[k]["word"], words[k + 1]["word"])})
    start0 = 0.0 if a.trim is None else max(0.0, words[first[0]]["start"] - a.trim)
    endN = dur if a.trim is None else min(dur, words[last[len(lines) - 1]]["end"] + a.trim)
    bounds = [start0] + cuts + [endN]

    # deviations, by line, from the difflib opcodes
    dev = {}
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        if i2 > i1:
            for i in range(i1, i2):
                dev.setdefault(ln[i], {"missing": [], "inserted": []})["missing"].append(sw[i])
        if j2 > j1:
            # inserted words belong to the line of the nearest script word
            l = ln[min(i1, len(ln) - 1)] if i1 < len(ln) else ln[-1]
            for j in range(j1, j2):
                w = words[tidx[j]]
                dev.setdefault(l, {"missing": [], "inserted": []})["inserted"].append(
                    {"word": w["word"], "at": round(w["start"], 2)})
    deviations = [{"line": l, "missing": d["missing"], "inserted": d["inserted"]} for l, d in sorted(dev.items())]
    rep = repeats(words)
    report = {"lines": len(lines), "tight": tight, "deviations": deviations, "repeats": rep}

    os.makedirs(a.outdir, exist_ok=True)
    info = [{"line": n, "start": round(bounds[n], 3), "end": round(bounds[n + 1], 3), "text": lines[n]}
            for n in range(len(lines))]
    json.dump({"cuts": [round(c, 3) for c in cuts], "lines": info}, open(os.path.join(a.outdir, "boundaries.json"), "w"),
              indent=1, ensure_ascii=False)
    json.dump(report, open(os.path.join(a.outdir, "report.json"), "w"), indent=1, ensure_ascii=False)

    if not a.report_only:
        fade = int(a.fade * SR)
        for n in range(len(lines)):
            seg = x[int(bounds[n] * SR):int(bounds[n + 1] * SR)].copy()
            if len(seg) > 2 * fade:
                seg[:fade] *= np.linspace(0, 1, fade)
                seg[-fade:] *= np.linspace(1, 0, fade)
            r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                                "-c:a", "pcm_s16le", os.path.join(a.outdir, "%02d.wav" % n)],
                               input=seg.astype(np.float32).tobytes(), capture_output=True)
            if r.returncode:
                sys.exit("split_lines.py: ffmpeg failed: " + r.stderr.decode()[-300:])

    print("%d lines cut from %.1f s%s" % (len(lines), dur, " (report only)" if a.report_only else " into " + a.outdir))
    print("\nTIGHT boundaries (silence < %.2f s): %d" % (a.tight, len(tight)))
    for t in tight:
        print("  line %d | %d at %.2f s, silence %.2f s  (%s)" % (t["between"][0], t["between"][1], t["at"], t["silence"], t["words"]))
    print("\nDEVIATIONS from the script: %d lines" % len(deviations))
    for d in deviations:
        ins = ", ".join("%s@%.2f" % (w["word"], w["at"]) for w in d["inserted"])
        print("  line %d  missing: %s  inserted: %s" % (d["line"], " ".join(d["missing"]) or "-", ins or "-"))
    print("\nREPEATS (possible false starts): %d" % len(rep))
    for r in rep:
        print("  %.2f-%.2f s  %s" % (r["at"], r["until"], r["text"]))


if __name__ == "__main__":
    main()
