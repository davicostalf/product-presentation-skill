#!/usr/bin/env python3
"""transcribe.py - word-level timestamps of a narration (input of cues.py).

Writes [{"word": "search", "start": 2.8, "end": 3.2, "prob": 0.99}, ...] using faster-whisper.
Transcribe the audio that ends up in the video (treated and cut), never the raw take.

Usage
  python3 transcribe.py narration-cut.wav words.json --lang en [--model small] [--start S --end S]
Options
  --lang CODE       spoken language (en, pt, es, ...). Required: auto-detection drifts on short clips
  --model NAME      faster-whisper model (default small; large-v3 is the most accurate and slow on CPU)
  --start/--end S   transcribe only this range; timestamps stay on the full file's clock
                    (use it to check a splice or a re-recorded sentence)

If faster-whisper is unavailable, produce words.json with any other aligner (WhisperX, a cloud
STT with word timestamps) in the same shape, or ask the user for one.

Dependencies: Python 3.9+, numpy, ffmpeg, faster-whisper (pip install faster-whisper; downloads the
model on first use, so it needs network access then).
"""
import argparse
import json
import subprocess
import sys


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("audio")
    ap.add_argument("out")
    ap.add_argument("--lang", required=True)
    ap.add_argument("--model", default="small")
    ap.add_argument("--start", type=float, default=0.0)
    ap.add_argument("--end", type=float, default=None)
    a = ap.parse_args()
    try:
        import numpy as np
        from faster_whisper import WhisperModel
    except ImportError as e:
        sys.exit("transcribe.py: missing dependency (%s). Run: pip install faster-whisper numpy" % e.name)

    cmd = ["ffmpeg", "-v", "error", "-ss", str(a.start)]
    if a.end is not None:
        cmd += ["-t", str(a.end - a.start)]
    cmd += ["-i", a.audio, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"]
    p = subprocess.run(cmd, capture_output=True)
    if p.returncode or not p.stdout:
        sys.exit("transcribe.py: ffmpeg could not read %s: %s" % (a.audio, p.stderr.decode()[-300:]))
    audio = np.frombuffer(p.stdout, dtype=np.float32)

    model = WhisperModel(a.model, device="cpu", compute_type="int8")
    segs, _ = model.transcribe(audio, language=a.lang, word_timestamps=True, beam_size=5,
                               condition_on_previous_text=False)
    words = []
    for s in segs:
        for w in s.words:
            words.append({"word": w.word.strip(), "start": round(a.start + w.start, 3),
                          "end": round(a.start + w.end, 3), "prob": round(w.probability, 3)})
    json.dump(words, open(a.out, "w"), indent=1, ensure_ascii=False)
    print("wrote %s (%d words)" % (a.out, len(words)))


if __name__ == "__main__":
    main()
