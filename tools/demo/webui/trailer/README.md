# Web UI trailer

Makes the narrated trailer of the whole web UI, `docs/assets/video/web-trailer.mp4` (with `.webm`, `.vtt` captions and `-poster.png`), for the docs home page tour. It is about three minutes: a hook, one fast scene per benefit, and a closing call to action.
Everything runs offline: the model is scripted (`../../fakellm.bxs` with `model.json`), the voice is [Kokoro](https://github.com/thewh1teagle/kokoro-onnx) (Apache 2.0, the tutorial voice `af_heart`, set in `../../narration/voice.json`) and the music and mix are [bx-audio](https://github.com/ortus-boxlang/bx-audio).

| File | What it does |
| --- | --- |
| `project/` | The demo agent: two profiles, two sub-agents (`researcher`, `writer`), two skills, gateways, routines on, usage on, and a web UI with three accounts (`ada` is an admin, `grace` and `linus` are members; the password is `demo-pass`) |
| `model.json` | The scripted answers, including a tool call that needs an approval |
| `seed.js` | Fills the app so every page looks lived in: 30 conversations (some with the sub-agents), notes, vault entries, routines with a report, tokens and a backup |
| `scenes.json` | One entry per scene: the id, the narration (`text`), the caption on the picture and the actions the capture performs (`page`) |
| `narrate.py` | Speaks each scene with Kokoro, a sentence at a time, and writes `<id>.wav` and `<id>.json` (length and caption cues) |
| `capture.js` | Drives the page with Playwright as the admin, puts each action at a fraction of its scene's narration, draws a cursor and the caption, and writes the video and `timeline.json` |
| `terminal.sh` | Writes the real output of three commands for the terminal scene |
| `mix.bxs` | Levels each line, places it at its scene, fits the music to the picture, ducks it under the voice, shapes its volume (up for the hook, a slow build, a lift for the call to action), masters, writes captions and muxes |

## The scenes

Hook, chat (tool cards and an approval), talk to a sub-agent, conversations, routines, registry, memory, vault, agent (composition, files, usage), gateways, logs, access, data and backups, settings (dark mode), phone layout and accessibility, the terminal and the API, and the closing card.

## Steps

1. Build the `project/` folder, give it a data home and an admin token, serve it and start the scripted model (the `openai-compatible` provider defaults to port 8080). A fresh data home matters: the page keeps conversations and theme there.
   ```bash
   export BXAGENTS_HOME=/var/lib/acme-support/data TRAILER_ADMIN_TOKEN=adminsecret
   mkdir -p $BXAGENTS_HOME/skills && cp -r project/skills/. $BXAGENTS_HOME/skills/
   bxAgents build --projectRoot=project && bxAgents serve project --port=8791
   boxlang ../../fakellm.bxs --port=8080 --script=$PWD/model.json
   ```
   The skills are copied into the data home so they show in the Registry as the agent's own.
2. `NODE_PATH=$(npm root -g) node seed.js --url=http://127.0.0.1:8791`
3. `python3 -m venv venv && venv/bin/pip install kokoro-onnx soundfile`, download `kokoro-v1.0.onnx` and `voices-v1.0.bin` from the [kokoro-onnx releases](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0), then `venv/bin/python -I narrate.py --out=out --folder=<where the two files are>`
4. `BXAGENTS=bxAgents URL=http://127.0.0.1:8791 TOKEN=adminsecret ./terminal.sh > out/terminal.txt` (run it in the project folder with the same `BXAGENTS_HOME`)
5. `NODE_PATH=$(npm root -g) node capture.js --url=http://127.0.0.1:8791 --out=out` records the page's own screencast, every frame stamped with the time the browser drew it, and writes `out/picture.mp4` exactly as long as `out/timeline.json` (Playwright's `recordVideo` drifts about 7 percent slow under load, so it is not used)
6. Render the music with bx-audio: `boxlang <bx-audio>/examples/01-pop-drive/pop-drive.bxs --out=out/music.wav --bars=93` (128 BPM, 93 bars is the picture's length; the mix cuts it to fit)
7. `boxlang mix.bxs --out=out --music=out/music.wav --video=out/picture.mp4 --videoOut=out/mixed.mp4`
8. `ffmpeg -i out/mixed.mp4 -c:v copy -c:a aac -b:a 96k -movflags +faststart out/web-trailer.mp4`, then `ffmpeg -i out/web-trailer.mp4 -c:v libvpx-vp9 -crf 36 -b:v 0 -c:a libopus -b:a 64k out/web-trailer.webm`. The captions are `out/web-trailer.vtt` and the poster is `out/shots/poster.png`.

The loudness matches the other videos on the site (about -22 LUFS integrated; `--lufs=-14` for a louder streaming master). The voice sits about 13 dB above the music while it speaks.

The two gateways in `project/gateways/` are `mock` gateways named `telegram` and `slack`: a real one would need a bot token and the network, and the demo has neither.
