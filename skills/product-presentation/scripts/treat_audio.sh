#!/usr/bin/env bash
# treat_audio.sh - light treatment of a recorded narration that keeps the voice natural.
#
# Chain, in order: high-pass 70 Hz (rumble) -> click removal -> declip (peak repair) ->
# gentle noise reduction (6 dB) -> subtle EQ (-1.5 dB at 250 Hz, +1.5 dB at 3.5 kHz) ->
# light compression (2:1) -> loudness normalization (two-pass loudnorm, -16 LUFS, -1.5 dBTP).
# Pitch and speed are NOT changed. Output: 48 kHz mono 16-bit WAV.
#
# Usage:
#   bash treat_audio.sh INPUT OUTPUT.wav [--no-denoise] [--stereo] [--lufs -16] [--tp -1.5]
#   bash treat_audio.sh narration-raw.m4a narration-treated.wav
# Cut the treated file (cut_audio.py) and transcribe the CUT file (transcribe.py), so every
# timestamp refers to the audio that ends up in the video.
#
# Dependencies: bash, ffmpeg (filters adeclick, adeclip, afftdn, equalizer, acompressor,
# loudnorm: all in standard builds). No other packages.

set -euo pipefail
if [ $# -lt 2 ]; then sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'; exit 2; fi
command -v ffmpeg >/dev/null || { echo "treat_audio.sh: ffmpeg not found (apt-get install -y ffmpeg)" >&2; exit 3; }
in="$1"; out="$2"; shift 2
[ -f "$in" ] || { echo "treat_audio.sh: input not found: $in" >&2; exit 2; }

denoise="afftdn=nr=6:nf=-45,"; ch=1; lufs=-16; tp=-1.5
while [ $# -gt 0 ]; do
  case "$1" in
    --no-denoise) denoise="" ;;
    --stereo) ch=2 ;;
    --lufs) lufs="$2"; shift ;;
    --tp) tp="$2"; shift ;;
    *) echo "treat_audio.sh: unknown option $1" >&2; exit 2 ;;
  esac
  shift
done

pre="highpass=f=70,adeclick=w=55:o=75:t=2:b=2,adeclip,${denoise}equalizer=f=250:t=q:w=1:g=-1.5,equalizer=f=3500:t=q:w=1:g=1.5,acompressor=threshold=-21dB:ratio=2:attack=8:release=160:makeup=1.5"
ln="I=${lufs}:TP=${tp}:LRA=9"

# Pass 1: measure loudness of the processed signal.
stats=$(ffmpeg -hide_banner -nostats -i "$in" -af "${pre},loudnorm=${ln}:print_format=json" -f null - 2>&1 || true)
get() { printf '%s\n' "$stats" | grep "\"$1\"" | tail -1 | sed 's/.*: *"\{0,1\}\([-0-9.inf]*\)"\{0,1\}.*/\1/'; }
mi=$(get input_i); mtp=$(get input_tp); mlra=$(get input_lra); mth=$(get input_thresh); mo=$(get target_offset)

if [ -n "$mi" ] && [ -n "$mth" ] && [ "$mi" != "-inf" ]; then
  norm="loudnorm=${ln}:measured_I=${mi}:measured_TP=${mtp}:measured_LRA=${mlra}:measured_thresh=${mth}:offset=${mo}:linear=true"
else
  echo "treat_audio.sh: could not measure loudness, using single-pass normalization" >&2
  norm="loudnorm=${ln}"
fi

ffmpeg -hide_banner -loglevel error -y -i "$in" -af "${pre},${norm}" -ar 48000 -ac "$ch" -c:a pcm_s16le "$out"
echo "treated: $out ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out") s, target ${lufs} LUFS)"
