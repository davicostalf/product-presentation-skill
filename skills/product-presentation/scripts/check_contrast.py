#!/usr/bin/env python3
"""check_contrast.py - contrast ratio between two colors, or between two points of an image.

Data marks and meaningful shapes on a slide (bars, lines, icons, chart segments, the light end of a scale) need at
least 3:1 against the surface they sit on (WCAG 1.4.11, non-text contrast). Run it on a frame of the RENDERED
video, not on the source colors: gradients, noise, opacity and video compression change what the viewer sees.
Text needs 4.5:1 (3:1 for large text); use --min 4.5 for it.

Usage
  python3 check_contrast.py frame.png --mark 840,512 --surface 900,512     two points of an image
  python3 check_contrast.py --colors "#9aa0a6" "#f4f4f2"                    two colors
  python3 check_contrast.py frame.png --mark 840,512 --surface 900,512 --radius 3 --min 3

A point is x,y in pixels of the image. The color of a point is the average of the square of (2 * radius + 1) pixels
around it (default radius 2), so noise and anti-aliasing do not decide the result. Exit status is 1 when the ratio is
below --min (default 3), so it can gate a script. It only reports; it never edits the image.

Dependencies: Python 3.9+, Pillow (only when an image is given).
"""
import argparse
import re
import sys


def parse_color(s):
    m = re.fullmatch(r"#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})", s.strip())
    if not m:
        sys.exit("check_contrast.py: not a hex color: %r (use #rgb or #rrggbb)" % s)
    h = m.group(1)
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def parse_point(s):
    m = re.fullmatch(r"\s*(\d+)\s*,\s*(\d+)\s*", s)
    if not m:
        sys.exit("check_contrast.py: not a point: %r (use x,y in pixels)" % s)
    return int(m.group(1)), int(m.group(2))


def luminance(rgb):
    def lin(c):
        c /= 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a, b):
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def sample(img, pt, radius):
    w, h = img.size
    x, y = pt
    if not (0 <= x < w and 0 <= y < h):
        sys.exit("check_contrast.py: point %d,%d is outside the image (%dx%d)" % (x, y, w, h))
    box = (max(x - radius, 0), max(y - radius, 0), min(x + radius + 1, w), min(y + radius + 1, h))
    crop = img.crop(box)
    px = [crop.getpixel((i, j)) for j in range(crop.size[1]) for i in range(crop.size[0])]
    return tuple(round(sum(p[i] for p in px) / len(px)) for i in range(3))


def hexs(c):
    return "#%02x%02x%02x" % c


def self_test():
    assert abs(ratio((0, 0, 0), (255, 255, 255)) - 21) < 1e-6
    assert ratio((255, 255, 255), (255, 255, 255)) == 1
    assert ratio(parse_color("#777"), parse_color("#fff")) > 4.4  # known: #777 on white is about 4.48
    assert ratio(parse_color("#ccc"), parse_color("#fff")) < 3
    print("self-test ok")


def main():
    if "--self-test" in sys.argv:
        return self_test()
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("image", nargs="?")
    ap.add_argument("--mark", help="x,y of the mark (the bar, the shape) in the image")
    ap.add_argument("--surface", help="x,y of the surface it sits on, in the image")
    ap.add_argument("--colors", nargs=2, metavar=("A", "B"), help="two hex colors instead of an image")
    ap.add_argument("--radius", type=int, default=2, help="average the (2r+1)^2 pixels around a point (default 2)")
    ap.add_argument("--min", type=float, default=3.0, help="minimum ratio (default 3; 4.5 for text)")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()

    if a.colors:
        c1, c2 = parse_color(a.colors[0]), parse_color(a.colors[1])
    elif a.image and a.mark and a.surface:
        try:
            from PIL import Image
        except ImportError:
            sys.exit("check_contrast.py: Pillow is needed for images (pip install pillow)")
        img = Image.open(a.image).convert("RGB")
        c1, c2 = sample(img, parse_point(a.mark), a.radius), sample(img, parse_point(a.surface), a.radius)
    else:
        ap.error("give an image with --mark and --surface, or --colors A B")

    r = ratio(c1, c2)
    ok = r >= a.min
    print("%s on %s: %.2f:1  %s (minimum %.1f:1)" % (hexs(c1), hexs(c2), r, "OK" if ok else "FAIL", a.min))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
