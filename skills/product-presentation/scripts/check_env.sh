#!/usr/bin/env bash
# check_env.sh - verify the machine can do REAL screen capture of a prototype.
#
# Checks: Xvfb (virtual display), ffmpeg with x11grab + libx264, Node 18+,
# Playwright, a Chromium binary, Python 3 with Pillow (compose.py), numpy (cut_audio.py).
# Exits 0 when everything needed for capture is present, 1 otherwise, and prints what is missing.
#
# If this fails, STOP and tell the user what is missing. Do not fall back to screenshots.
#
# Usage: bash check_env.sh
# Dependencies: bash, coreutils.

missing=0
ok()   { printf '  ok       %s\n' "$1"; }
miss() { printf '  MISSING  %s\n           fix: %s\n' "$1" "$2"; missing=1; }
warn() { printf '  optional %s\n           %s\n' "$1" "$2"; }

echo "Capture requirements"
command -v Xvfb >/dev/null && ok "Xvfb" || miss "Xvfb (virtual display)" "apt-get install -y xvfb"

if command -v ffmpeg >/dev/null; then
  ok "ffmpeg"
  ffmpeg -hide_banner -devices 2>/dev/null | grep -q x11grab && ok "ffmpeg x11grab" || miss "ffmpeg x11grab device" "install an ffmpeg build with x11grab (apt-get install -y ffmpeg)"
  ffmpeg -hide_banner -encoders 2>/dev/null | grep -q libx264 && ok "ffmpeg libx264" || miss "ffmpeg libx264 encoder" "install an ffmpeg build with libx264"
else
  miss "ffmpeg" "apt-get install -y ffmpeg"
fi

if command -v node >/dev/null; then
  major=$(node -p 'process.versions.node.split(".")[0]')
  [ "$major" -ge 18 ] && ok "node $(node -v)" || miss "Node 18+ (found $(node -v))" "install a current Node.js"
  pw=$(node -e "
    const {execSync}=require('child_process');
    let p;try{p=require('playwright')}catch(e){try{p=require('playwright-core')}catch(e2){
      try{p=require(require('path').join(execSync('npm root -g').toString().trim(),'playwright'))}catch(e3){}}}
    if(!p){console.log('NOPW');process.exit(0)}
    const c=process.env.CHROME_PATH||p.chromium.executablePath();
    console.log(require('fs').existsSync(c)?'OK '+c:'NOCHROME '+c);" 2>/dev/null)
  case "$pw" in
    OK*)       ok "playwright + Chromium (${pw#OK })" ;;
    NOCHROME*) miss "Chromium binary (${pw#NOCHROME })" "npx playwright install chromium   (or set CHROME_PATH)" ;;
    *)         miss "playwright (Node package)" "npm install playwright && npx playwright install chromium" ;;
  esac
else
  miss "node" "install Node.js 18+"
fi

echo "Composition and audio"
if command -v python3 >/dev/null; then
  ok "python3 $(python3 -V 2>&1 | cut -d' ' -f2)"
  python3 -c "import PIL" 2>/dev/null && ok "Pillow (compose.py)" || miss "Pillow (compose.py)" "pip install pillow"
  python3 -c "import numpy" 2>/dev/null && ok "numpy (cut_audio.py)" || warn "numpy (cut_audio.py)" "pip install numpy"
  python3 -c "import faster_whisper" 2>/dev/null && ok "faster-whisper (transcribe.py)" || warn "faster-whisper (transcribe.py)" "pip install faster-whisper, or bring your own word-timestamp JSON"
else
  miss "python3" "install Python 3.9+"
fi

echo
if [ "$missing" -eq 0 ]; then echo "READY: real capture is possible."; exit 0; fi
echo "NOT READY: the items above are missing. Tell the user. Do NOT substitute screenshots for video."
exit 1
