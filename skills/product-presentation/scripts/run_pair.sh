#!/usr/bin/env bash
# run_pair.sh - record the desktop and the phone take of ONE scenario in parallel.
#
# Two virtual displays, two Chromium windows, two ffmpeg processes, started together so both
# clips share the same scenario clock. Each clip starts with a red marker that compose.py uses
# to cut both at exactly scenario time 0.
#
# Usage:
#   bash run_pair.sh SCENARIO.mjs URL OUTDIR [CUES.json] [extra record.mjs options]
#   bash run_pair.sh scenario.mjs http://localhost:3000/ out cues.json
# Produces OUTDIR/desktop.mkv, OUTDIR/phone.mkv (+ .json event logs).
# The phone take is the prototype in a 390x844 iframe inside a host page (see record.mjs): scenarios
# locate elements through ctx.app and open the page with ctx.open(url).
#
# The scenario receives ctx.mode ('desktop' or 'phone') and branches where the two UIs differ.
# Dependencies: bash, node + record.mjs and its dependencies (see check_env.sh).

set -u
if [ $# -lt 3 ]; then sed -n "2,17p" "$0" | sed 's/^# \{0,1\}//'; exit 2; fi
here="$(cd "$(dirname "$0")" && pwd)"
scenario="$1"; url="$2"; outdir="$3"; shift 3
cues=()
if [ $# -gt 0 ] && [ "${1#--}" = "$1" ]; then cues=(--cues "$1"); shift; fi
mkdir -p "$outdir"

node "$here/record.mjs" --scenario "$scenario" --url "$url" --mode desktop --out "$outdir/desktop.mkv" ${cues[@]+"${cues[@]}"} "$@" > "$outdir/desktop.log" 2>&1 &
pd=$!
node "$here/record.mjs" --scenario "$scenario" --url "$url" --mode phone --out "$outdir/phone.mkv" ${cues[@]+"${cues[@]}"} "$@" > "$outdir/phone.log" 2>&1 &
pp=$!

rc=0
wait $pd || { echo "desktop recording failed, see $outdir/desktop.log" >&2; rc=1; }
wait $pp || { echo "phone recording failed, see $outdir/phone.log" >&2; rc=1; }
[ $rc -eq 0 ] && echo "ok: $outdir/desktop.mkv $outdir/phone.mkv"
exit $rc
