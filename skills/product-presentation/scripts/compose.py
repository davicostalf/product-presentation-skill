#!/usr/bin/env python3
"""compose.py - put the desktop clip and the phone clip side by side on a flat background.

The composition is fixed on purpose. Flat light background (#F2F3F5 by default), the desktop
window on the left and the phone on the right, vertically centered, together filling most of
the frame. The desktop has slightly rounded corners, the phone a rounded device frame (a thin
dark bezel). NOTHING else: no card, panel, border or drop shadow around the screens, no laptop
or other device mockup.

Layout (pixels, 16:9 frame; every number scales with the frame height):

                    1920x1080 (1080p)     2560x1440 (1440p)
    desktop window  1336x835 at (50,122)  1781x1113 at (67,163)    corner radius 12 / 16
    phone screen     415x900 at (1441,90)  553x1200 at (1921,120)  corner radius 40 / 53
    phone bezel      6 px outside the screen (8 px at 1440p)
    gap between      55 px (73 px)         vertical centers: both at 540 (720)

Inputs are the raw recordings from record.mjs (desktop 16:10, phone ~9:19.5). Each clip is cut
at scenario time 0 (found from the red marker record.mjs shows before the scenario starts) so
the two stay in sync, trimmed of the 2 px strip Chromium leaves at the right/bottom edge, scaled
with lanczos and masked. Audio is not handled here; add it when assembling.

Usage:
  python3 compose.py --desktop desktop.mkv --phone phone.mkv --out demo.mp4 [--height 1080]
  python3 compose.py ... --still 3.5 frame.png        # also save the composite frame at 3.5 s
Options:
  --height {1080,1440}   frame height (default 1080; 1440 gives 2560x1440; any multiple of 9 works)
  --bg HEX               background color (default F2F3F5)
  --bezel N              phone bezel thickness at 1080p, 0 = none (default 6)
  --start S              start S seconds after scenario time 0 (default 0)
  --duration S           length in seconds (default: as long as both clips allow)
  --no-marker            clips have no red marker: start both at 0
  --crf N / --preset P   x264 settings (default 14 / veryfast; use 17+ medium for the final export)
  --still T OUT.png      write the composite frame at time T (seconds) to OUT.png

Dependencies: Python 3.9+, Pillow (pip install pillow), ffmpeg + ffprobe.
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw

REF_H = 1080
DESK = (50, 122, 1336, 835)    # x, y, w, h at 1080p
PHONE = (1441, 90, 415, 900)
R_DESK, R_PHONE = 12, 40
FPS = 30
TRIM = 2                        # px cut from right/bottom of the raw capture


def die(msg, code=2):
    print("compose.py: " + msg, file=sys.stderr)
    sys.exit(code)


def need(tool):
    if not shutil.which(tool):
        die(f"{tool} not found. Install ffmpeg (apt-get install -y ffmpeg).", 3)


def probe_duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", path],
                       capture_output=True, text=True)
    if r.returncode:
        die(f"cannot read {path}: {r.stderr.strip()[-300:]}")
    return float(json.loads(r.stdout)["format"]["duration"])


def marker_end(path):
    """Seconds (30 fps grid) of the first non-red frame after the red marker; None if no marker."""
    p = subprocess.run(["ffmpeg", "-loglevel", "error", "-t", "20", "-i", path, "-vf", f"fps={FPS},scale=4:4",
                        "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True)
    b = p.stdout
    seen = False
    for i in range(len(b) // 48):
        r, g, bl = b[i * 48], b[i * 48 + 1], b[i * 48 + 2]
        if r > 200 and g < 60 and bl < 60:
            seen = True
        elif seen:
            return i / FPS
    return None


def rounded_mask(path, w, h, r):
    ss = 4  # supersample for smooth corners
    im = Image.new("L", (w * ss, h * ss), 0)
    ImageDraw.Draw(im).rounded_rectangle((0, 0, w * ss - 1, h * ss - 1), radius=r * ss, fill=255)
    im.resize((w, h), Image.LANCZOS).save(path)


def bezel_image(path, w, h, r, color):
    ss = 4
    im = Image.new("RGBA", (w * ss, h * ss), (0, 0, 0, 0))
    ImageDraw.Draw(im).rounded_rectangle((0, 0, w * ss - 1, h * ss - 1), radius=r * ss, fill=color)
    im.resize((w, h), Image.LANCZOS).save(path)


def layout(height):
    s = height / REF_H
    sc = lambda t: tuple(int(round(v * s)) for v in t)
    return sc(DESK), sc(PHONE), int(round(R_DESK * s)), int(round(R_PHONE * s)), s


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--desktop", required=True)
    ap.add_argument("--phone", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--height", type=int, default=1080)
    ap.add_argument("--bg", default="F2F3F5")
    ap.add_argument("--bezel", type=float, default=6)
    ap.add_argument("--start", type=float, default=0.0)
    ap.add_argument("--duration", type=float, default=None)
    ap.add_argument("--no-marker", action="store_true")
    ap.add_argument("--crf", default="14")
    ap.add_argument("--preset", default="veryfast")
    ap.add_argument("--still", nargs=2, metavar=("T", "OUT"))
    a = ap.parse_args()

    need("ffmpeg"); need("ffprobe")
    for f in (a.desktop, a.phone):
        if not os.path.exists(f):
            die(f"input not found: {f}")
    if a.height % 9:
        die("--height must be a multiple of 9 so the frame is exactly 16:9")
    H = a.height
    W = H * 16 // 9
    (dx, dy, dw, dh), (px, py, pw, ph), rd, rp, s = layout(H)
    bz = int(round(a.bezel * s))
    bg = a.bg.lstrip("#")

    if a.no_marker:
        t0d = t0p = 0.0
    else:
        t0d, t0p = marker_end(a.desktop), marker_end(a.phone)
        for name, t in (("desktop", t0d), ("phone", t0p)):
            if t is None:
                die(f"no red start marker found in the {name} clip. Record with record.mjs, or pass --no-marker.")
    t0d += a.start
    t0p += a.start
    room = min(probe_duration(a.desktop) - t0d, probe_duration(a.phone) - t0p)
    if room <= 0.1:
        die("clips are shorter than the requested start")
    dur = min(a.duration, room) if a.duration else room

    tmp = tempfile.mkdtemp(prefix="compose-")
    try:
        md, mp, bzp = (os.path.join(tmp, n) for n in ("md.png", "mp.png", "bz.png"))
        rounded_mask(md, dw, dh, rd)
        rounded_mask(mp, pw, ph, rp)
        if bz:
            bezel_image(bzp, pw + 2 * bz, ph + 2 * bz, rp + bz, (22, 23, 26, 255))

        def clip(i, t0, w, h):
            return (f"[{i}:v]trim=start={t0:.4f}:duration={dur + 1:.4f},setpts=PTS-STARTPTS,fps={FPS},"
                    f"crop=iw-{TRIM}:ih-{TRIM}:0:0,scale={w + 4}:{h + 4}:force_original_aspect_ratio=increase:flags=lanczos,"
                    f"crop={w}:{h}:exact=1,format=yuva420p")
        loop = ["-loop", "1", "-framerate", str(FPS)]
        cmd = ["ffmpeg", "-loglevel", "error", "-y",
               "-f", "lavfi", "-i", f"color=c=0x{bg}:s={W}x{H}:r={FPS}",       # 0 flat background
               "-i", a.desktop, "-i", a.phone,                                  # 1, 2
               *loop, "-i", md, *loop, "-i", mp]                                # 3, 4
        if bz:
            cmd += [*loop, "-i", bzp]                                           # 5
        fc = [clip(1, t0d, dw, dh) + "[dc]", clip(2, t0p, pw, ph) + "[pc]",
              "[3:v]format=gray[md]", "[4:v]format=gray[mp]",
              "[dc][md]alphamerge[dk]", "[pc][mp]alphamerge[ph]",
              f"[0:v][dk]overlay={dx}:{dy}:format=auto[a]"]
        if bz:
            fc += [f"[a][5:v]overlay={px - bz}:{py - bz}:format=auto[b]", f"[b][ph]overlay={px}:{py}:format=auto,format=yuv420p[o]"]
        else:
            fc += [f"[a][ph]overlay={px}:{py}:format=auto,format=yuv420p[o]"]
        cmd += ["-filter_complex", ";".join(fc), "-map", "[o]", "-t", f"{dur:.3f}", "-r", str(FPS),
                "-c:v", "libx264", "-preset", a.preset, "-crf", a.crf, "-pix_fmt", "yuv420p", "-an", a.out]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode:
            die("ffmpeg failed:\n" + r.stderr[-1500:], 1)
        print(f"composed {a.out}: {W}x{H}, {dur:.2f}s, desktop {dw}x{dh}@({dx},{dy}), phone {pw}x{ph}@({px},{py})")
        if a.still:
            t, outpng = float(a.still[0]), a.still[1]
            r = subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{t:.3f}", "-i", a.out, "-frames:v", "1", outpng],
                               capture_output=True, text=True)
            if r.returncode:
                die("could not extract still:\n" + r.stderr[-800:], 1)
            print("still", outpng)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
