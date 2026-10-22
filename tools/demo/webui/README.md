# Web UI walkthrough

Makes the screenshots and the narrated video in the [web UI docs](../../../docs/conventions/web-ui.md#walkthrough).
Everything runs offline: the model is scripted (`../fakellm.bxs` with `model.json`), the voice and music come
from [bx-audio](https://github.com/ortus-boxlang/bx-audio).

| File | What it does |
| --- | --- |
| `project/` | The demo agent: two profiles, a `now` tool, notes, and a web UI with one account (`ada`, password `demo-pass`) |
| `model.json` | The scripted answers. `{model}` is replaced by the model name the page asked for, so the picker shows |
| `scenes.json` | One entry per scene: the id and the narration |
| `narrate.bxs` | Speaks each scene with `audioSpeakCues`, writes `<id>.wav` and `<id>.json` (length and caption cues) |
| `capture.js` | Drives the page with Playwright, holds each scene for as long as its narration, writes the screenshots, the video and `timeline.json` |
| `mix.bxs` | Places each line at its scene, fits the music to the picture, ducks it under the voice, masters, writes captions and muxes |

## Steps

1. `bxAgents build` the `project/` folder, serve it (`bxAgents serve`) and start the scripted model (the `openai-compatible` provider defaults to port 8080):
   `boxlang ../fakellm.bxs --port=8080 --script=$PWD/model.json`
2. `boxlang narrate.bxs --out=out` (needs the `bxaudio` module, the voice downloads the first time)
3. `NODE_PATH=$(npm root -g) node capture.js --url=http://127.0.0.1:8780/chat --out=out`
4. `ffmpeg -i out/walkthrough.webm -c:v libx264 -crf 27 -pix_fmt yuv420p -an out/picture.mp4`
5. Render music, for example `boxlang <bx-audio>/examples/02-lofi/lofi.bxs --out=out/music.wav --bars=32`
6. `boxlang mix.bxs --out=out --music=out/music.wav --video=out/picture.mp4 --videoOut=out/walkthrough.mp4`

Start from a fresh `data/` folder (the page keeps conversations and theme there), or the old chats show up in the shots.
