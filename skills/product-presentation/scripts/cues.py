#!/usr/bin/env python3
"""cues.py - turn word timestamps into a cue list that drives a capture scenario.

A recording scenario (scenario-example.mjs) acts when the narration says something: the screen
must show the thing 0.3-0.8 s BEFORE the words name it. This script finds named phrases in the
word-timestamp JSON of the (treated and cut) narration and writes {key: seconds}.

Inputs
  words.json    [{"word": "search", "start": 2.8, "end": 3.2}, ...]   (transcribe.py output)
  phrases.json  [{"key": "type", "phrase": "she types what she needs"},
                 {"key": "send", "phrase": "in the search field", "end": true},
                 {"key": "next", "phrase": "the list comes back", "snap": true}]
                  phrase  words to find, in order, after the previous match (case, accents and
                          punctuation are ignored)
                  end     true: the cue is the END of the phrase instead of its start
                  snap    true (needs --wav): start cue moves to the end of the nearest quiet run,
                          i.e. the real sentence onset; end cues always snap to the start of the
                          quiet run that follows when --wav is given

Output (stdout or --out): {"type": 0.92, "send": 3.65, ...}

Usage
  python3 cues.py words.json phrases.json [--wav narration.wav] [--out cues.json]
  python3 cues.py words.json phrases.json --advance 0.5   # shift start cues 0.5 s earlier

Dependencies: Python 3.9+. numpy only when --wav is used (16-bit PCM WAV).
"""
import argparse
import json
import re
import sys
import unicodedata


def norm(x):
    x = unicodedata.normalize("NFD", x.lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9 ]", "", x)


def quiet_runs(wav_path, threshold=0.005, min_len=0.1):
    """Quiet stretches (start, end) in seconds, from 10 ms RMS frames; threshold is a fraction of full scale."""
    import wave
    import numpy as np
    wf = wave.open(wav_path)
    if wf.getsampwidth() != 2:
        sys.exit("cues.py: --wav must be 16-bit PCM (run treat_audio.sh or ffmpeg -c:a pcm_s16le)")
    ch, sr = wf.getnchannels(), wf.getframerate()
    x = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(float)
    if ch > 1:
        x = x.reshape(-1, ch).mean(axis=1)
    x /= 32768.0
    f = int(sr * 0.01)
    rms = np.sqrt((x[: len(x) // f * f].reshape(-1, f) ** 2).mean(axis=1))
    runs, i = [], 0
    while i < len(rms):
        if rms[i] < threshold:
            j = i
            while j < len(rms) and rms[j] < threshold:
                j += 1
            if (j - i) * 0.01 >= min_len:
                runs.append((i * 0.01, j * 0.01))
            i = j
        else:
            i += 1
    return runs


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("words")
    ap.add_argument("phrases")
    ap.add_argument("--wav")
    ap.add_argument("--out")
    ap.add_argument("--advance", type=float, default=0.0, help="subtract this many seconds from start cues")
    a = ap.parse_args()

    words = json.load(open(a.words))
    nw = [norm(w["word"]) for w in words]
    spec = json.load(open(a.phrases))
    if isinstance(spec, dict):
        spec = [{"key": k, "phrase": v} for k, v in spec.items()]
    qr = quiet_runs(a.wav) if a.wav else []

    def onset(t):
        best = None
        for s, e in qr:
            if e - s >= 0.25 and t - 0.5 <= e <= t + 0.7 and (best is None or abs(e - t) < abs(best - t)):
                best = e
        return round(best - 0.02, 3) if best else t

    def offset(t):
        for s, e in qr:
            if e - s >= 0.25 and s >= t - 0.3:
                return round(s + 0.02, 3) if s <= t + 1.2 else t
        return t

    cues, pos = {}, 0
    for item in spec:
        p = norm(item["phrase"]).split()
        if not p:
            sys.exit(f"cues.py: empty phrase for key {item['key']!r}")
        for i in range(pos, len(nw) - len(p) + 1):
            if nw[i:i + len(p)] == p:
                pos = i + len(p)
                if item.get("end"):
                    t = offset(words[i + len(p) - 1]["end"]) if qr else words[i + len(p) - 1]["end"]
                else:
                    t = onset(words[i]["start"]) if (qr and item.get("snap")) else words[i]["start"]
                    t = t - a.advance
                cues[item["key"]] = round(max(0.0, t), 3)
                break
        else:
            sys.exit(f"cues.py: phrase not found after position {pos}: {item['phrase']!r} (key {item['key']!r}). "
                     "Check spelling against words.json, or the order of phrases.")
    text = json.dumps(cues, indent=1)
    if a.out:
        open(a.out, "w").write(text + "\n")
        print(f"wrote {a.out}", file=sys.stderr)
    else:
        print(text)


if __name__ == "__main__":
    main()
