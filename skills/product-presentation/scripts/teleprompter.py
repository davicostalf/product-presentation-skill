#!/usr/bin/env python3
"""teleprompter.py - build the teleprompter page from the script (one HTML file).

The page reads the script one sentence at a time: the sentence being read is bright on a fixed reading
line, the ones before it are dim, section headings and the screen each line goes with are marked.
Two ways to follow the reader:
  Pace   the text rolls at a steady words-per-minute rate (default 120), adjustable while reading.
  Voice  browser speech recognition follows what the presenter says: it matches the last ~6 recognized
         words against a forward window of the script, widens the window after ~4 s without a match,
         restarts itself when the browser ends recognition (and after ~8 s with no results), and keeps
         retrying on network errors. Status messages say what is wrong (mic blocked, wrong mic or no
         speech heard, no network).
Also: countdown, wake lock, text size, mirror, previous/next sentence, a pause between sections.
Inline marks in a line's text: "/" is a breath (holds the roll 0.6 s), _word_ underlines a stressed word.

Inputs
  script.json  either the project script, {"title": ..., "sections": [{"id": "intro", "cover": "Case 1 of 3",
               "lines": [{"text": "...", "screen": "what is on screen", "slide": "ref"}, ...]}, ...]}
               (section heading = head, title, cover or id; "screen" is shown when it changes), or a plain
               list [{"head": "1 - Intro", "cue": "optional screen note", "lines": ["sentence", ...]}, ...]
               (a line may also be an object with "text" and "screen")
  out.html     the page to write

Usage
  python3 teleprompter.py script.json out.html [--wpm 120] [--lang en|pt] [--section-pause 1.2]
                          [--ui ui.json] [--speech-lang CODE] [--title TEXT]
Options
  --lang CODE        language of the script: sets the interface labels (en, pt) AND the speech recognition
                     language (en -> en-US, pt -> pt-BR); recognition must follow the script's language
  --speech-lang CODE override the recognition locale (e.g. en-GB, es-ES)
  --ui ui.json       override or add interface strings (keys as in the UI table below)
  --wpm N            starting pace of Pace mode (90-220, default 120)
  --section-pause S  seconds of breath between sections in Pace mode (default 1.2)

Run it (Voice mode needs http, not file://, and internet: Chrome sends the audio to its recognition service)
  python3 -m http.server 8000      # in the folder with out.html
  open http://localhost:8000/out.html in Chrome or Edge, allow the microphone

Dependencies: Python 3.9+, no packages. The page loads two fonts from Google Fonts and falls back to system fonts offline.
"""
import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(HERE, "..", "assets", "teleprompter.html")
PLACEHOLDER = "/*TP_DATA*/null"

SPEECH = {"en": "en-US", "pt": "pt-BR", "es": "es-ES", "fr": "fr-FR", "de": "de-DE", "it": "it-IT"}

UI = {
    "en": {
        "toolbar": "Teleprompter controls", "screen": "Screen", "start": "Start", "pause": "Pause", "resume": "Resume",
        "restart": "Restart", "follow": "Follow", "modeTime": "Pace", "modeVoice": "Voice", "wpmUnit": "wpm",
        "slower": "Slower", "faster": "Faster", "prev": "◀ Sentence", "next": "Sentence ▶", "prevSentence": "Previous sentence",
        "nextSentence": "Next sentence", "text": "Text", "smallerText": "Smaller text", "biggerText": "Bigger text",
        "mirror": "Mirror",
        "keys": "<kbd>Space</kbd> start or pause · <kbd>↑</kbd> <kbd>↓</kbd> pace · <kbd>←</kbd> <kbd>→</kbd> sentence · <kbd>R</kbd> restart · in Voice mode the text follows what you say",
        "noApi": "This browser has no speech recognition. Open the page in Chrome or Edge, from http://localhost.",
        "pressStart": "Press Start and read", "listening": "Listening", "hearing": "Hearing:",
        "micOn": "Listening: microphone on, go ahead", "soundHeard": "Heard speech, waiting for the words…",
        "micBlocked": "Microphone blocked. Open the page from http://localhost in Chrome and allow the microphone.",
        "noMic": "The browser found no microphone. Check the system privacy settings and that the right input is selected.",
        "network": "No connection to the speech recognition service. Trying again…",
        "langUnsupported": "The browser does not support this language for speech recognition.",
        "noSpeech": "Heard no speech ({0}x). The browser may be on the wrong microphone: icon left of the address bar, Microphone.",
        "error": "Speech recognition error: {0}", "cannotListen": "Could not start listening here. Open the page in Chrome.",
        "paused": "Paused", "end": "End of the text",
    },
    "pt": {
        "toolbar": "Controles do teleprompter", "screen": "Tela", "start": "Começar", "pause": "Pausar", "resume": "Continuar",
        "restart": "Do início", "follow": "Seguir", "modeTime": "Ritmo", "modeVoice": "Voz", "wpmUnit": "pal/min",
        "slower": "Mais devagar", "faster": "Mais rápido", "prev": "◀ Frase", "next": "Frase ▶", "prevSentence": "Frase anterior",
        "nextSentence": "Próxima frase", "text": "Texto", "smallerText": "Diminuir texto", "biggerText": "Aumentar texto",
        "mirror": "Espelhar",
        "keys": "<kbd>Espaço</kbd> começar ou pausar · <kbd>↑</kbd> <kbd>↓</kbd> ritmo · <kbd>←</kbd> <kbd>→</kbd> frase · <kbd>R</kbd> do início · no modo Voz, o texto avança conforme você fala",
        "noApi": "Este navegador não tem reconhecimento de voz. Abra a página no Chrome ou no Edge, em http://localhost.",
        "pressStart": "Aperte Começar e leia", "listening": "Ouvindo", "hearing": "Ouvindo:",
        "micOn": "Ouvindo: microfone ligado, pode ler", "soundHeard": "Ouvi som de fala, esperando as palavras…",
        "micBlocked": "Sem acesso ao microfone. Abra a página em http://localhost no Chrome e permita o microfone.",
        "noMic": "O navegador não encontrou o microfone. Confira as configurações de privacidade do sistema e a entrada escolhida.",
        "network": "Sem conexão com o reconhecimento de voz. Tentando de novo…",
        "langUnsupported": "O navegador não reconhece este idioma para a voz.",
        "noSpeech": "Não ouvi nenhuma fala ({0}×). O navegador pode estar no microfone errado: ícone à esquerda do endereço, Microfone.",
        "error": "Erro do reconhecimento de voz: {0}", "cannotListen": "Não foi possível ouvir aqui. Abra a página no Chrome.",
        "paused": "Pausado", "end": "Fim do texto",
    },
}


def as_line(x):
    if isinstance(x, str):
        return {"text": x, "screen": ""}
    return {"text": x.get("text", ""), "screen": x.get("screen", "") or x.get("cue", "")}


def build_sections(data):
    """Normalize both accepted shapes to [{head, ps: [{text, cue}]}]; cue is set only where the screen changes."""
    if isinstance(data, dict):
        if "sections" not in data:
            sys.exit("teleprompter.py: expected a list of {head, lines} or an object with \"sections\"")
        raw = []
        for i, s in enumerate(data["sections"], 1):
            title = s.get("head") or s.get("title") or s.get("cover") or s.get("id") or "Section %d" % i
            raw.append({"head": "%d · %s" % (i, title), "cue": s.get("cue", ""), "lines": s.get("lines", [])})
    elif isinstance(data, list):
        raw = [{"head": s.get("head") or "Section %d" % i, "cue": s.get("cue", ""), "lines": s.get("lines", [])}
               for i, s in enumerate(data, 1)]
    else:
        sys.exit("teleprompter.py: the script must be a JSON list or object")
    out = []
    for s in raw:
        ps, prev = [], None
        for k, ln in enumerate(map(as_line, s["lines"])):
            if not ln["text"].strip():
                continue
            screen = ln["screen"] or (s["cue"] if k == 0 else "")
            ps.append({"text": ln["text"].strip(), "cue": screen if screen and screen != prev else ""})
            prev = screen or prev
        if ps:
            out.append({"head": s["head"], "ps": ps})
    if not out:
        sys.exit("teleprompter.py: the script has no lines")
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("script")
    ap.add_argument("out")
    ap.add_argument("--wpm", type=int, default=120)
    ap.add_argument("--lang", default="en")
    ap.add_argument("--speech-lang", default=None)
    ap.add_argument("--section-pause", type=float, default=1.2)
    ap.add_argument("--ui", default=None)
    ap.add_argument("--title", default=None)
    a = ap.parse_args()

    data = json.load(open(a.script, encoding="utf-8"))
    base = a.lang.split("-")[0].lower()
    ui = dict(UI.get(base, UI["en"]))
    if base not in UI:
        print("teleprompter.py: no interface labels for %r, using English (override with --ui)" % a.lang, file=sys.stderr)
    if a.ui:
        ui.update(json.load(open(a.ui, encoding="utf-8")))
    speech = a.speech_lang or (a.lang if "-" in a.lang else SPEECH.get(base, a.lang))
    title = a.title or (data.get("title") if isinstance(data, dict) else None) or "Teleprompter"
    payload = {"sections": build_sections(data), "ui": ui, "lang": base, "speechLang": speech,
               "wpm": max(90, min(220, a.wpm)), "sectionPause": a.section_pause, "title": title}
    html = open(TEMPLATE, encoding="utf-8").read()
    if PLACEHOLDER not in html:
        sys.exit("teleprompter.py: placeholder %s not found in %s" % (PLACEHOLDER, TEMPLATE))
    blob = json.dumps(payload, ensure_ascii=False).replace("</", "<\\/")
    open(a.out, "w", encoding="utf-8").write(html.replace(PLACEHOLDER, blob))
    n = sum(len(s["ps"]) for s in payload["sections"])
    words = sum(len(p["text"].split()) for s in payload["sections"] for p in s["ps"])
    print("wrote %s (%d sections, %d lines, %d words, ~%.1f min at %d wpm, recognition %s)"
          % (a.out, len(payload["sections"]), n, words, words / max(a.wpm, 1), a.wpm, speech))


if __name__ == "__main__":
    main()
