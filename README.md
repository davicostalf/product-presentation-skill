# product-presentation-skill

[![Validate skill](https://github.com/davicostalf/product-presentation-skill/actions/workflows/validate.yml/badge.svg)](https://github.com/davicostalf/product-presentation-skill/actions/workflows/validate.yml)

An [Agent Skill](https://agentskills.io) for planning and producing presentations of a product or prototype: script, slides, storyboard, and delivery, including narrated demo videos with desktop and phone screen recordings and a voice-over recorded by the presenter.

## What's inside

```
skills/product-presentation/
├── SKILL.md                         # workflow, script rules, storyboard, sync, capture rules, common mistakes
├── references/
│   ├── presentation-types.md        # sequences and rules per presentation type
│   └── recorded-delivery.md         # narration, audio, capture, assembly, verification
├── scripts/
│   ├── check_env.sh                 # is real capture possible here?
│   ├── cursor.js                    # injected pointer (arrow / touch dot) + glide, click, type, scroll
│   ├── record.mjs                   # one scenario -> video (Xvfb + Chromium + ffmpeg; phone = 390x844 iframe host)
│   ├── run_pair.sh                  # desktop and phone in parallel
│   ├── compose.py                   # desktop + phone side by side on the flat background
│   ├── scenario-example.mjs         # cue-driven example scenario
│   ├── scenario-slide-example.mjs   # live slide recording
│   ├── transcribe.py                # word timestamps
│   ├── cues.py                      # phrases -> cue list
│   ├── treat_audio.sh               # light voice treatment
│   └── cut_audio.py                 # cuts at energy minima
└── assets/
    ├── reference-frame.png          # target composition (1920x1080)
    ├── placeholder-store.html       # neutral page to test the scripts
    └── example-*.json               # example words, phrases and cues
```

## Install

**Claude Code**

```
/plugin marketplace add davicostalf/product-presentation-skill
/plugin install product-presentation@product-presentation-skill
```

**Other agents that support Agent Skills**

Copy `skills/product-presentation/` into the skills directory your agent reads (for Claude Code without the plugin: `.claude/skills/` in a project or `~/.claude/skills/` for every project).

## Validation

Every push runs the official validator from the [Agent Skills specification](https://agentskills.io/specification). To run it locally:

```
uvx --from "git+https://github.com/agentskills/agentskills#subdirectory=skills-ref" skills-ref validate skills/product-presentation
```

## Also in this repo

- [IDEAS.md](IDEAS.md): proposals under consideration.
- [CHANGELOG.md](CHANGELOG.md): version history.

## License

[MIT](LICENSE)
