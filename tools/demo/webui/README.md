# Web UI walkthrough

Makes the screenshots and the narrated video in the [web UI docs](../../../docs/conventions/web-ui.md#walkthrough).
Everything runs offline: the model is scripted (`../fakellm.bxs` with `model.json`), the voice is [Kokoro](https://github.com/thewh1teagle/kokoro-onnx)
(Apache 2.0, British female `bf_emma`) and the music and mix are [bx-audio](https://github.com/ortus-boxlang/bx-audio).

| File | What it does |
| --- | --- |
| `project/` | The demo agent: two profiles, a `now` tool, notes, and a web UI with one account (`ada`, password `demo-pass`) |
| `model.json` | The scripted answers. `{model}` is replaced by the model name the page asked for, so the picker shows |
| `scenes.json` | One entry per scene: the id and the narration |
| `narrate.py` | Speaks each scene with Kokoro, a sentence at a time, and writes `<id>.wav` and `<id>.json` (length and caption cues) |
| `capture.js` | Drives the page with Playwright, holds each scene for as long as its narration, writes the screenshots, the video and `timeline.json` |
| `mix.bxs` | Levels each line, places it at its scene, fits the music to the picture, ducks it under the voice, masters, writes captions and muxes |

## Steps

1. `bxAgents build` the `project/` folder, serve it (`bxAgents serve`) and start the scripted model (the `openai-compatible` provider defaults to port 8080):
   `boxlang ../fakellm.bxs --port=8080 --script=$PWD/model.json`
2. `python3 -m venv venv && venv/bin/pip install kokoro-onnx soundfile`, download `kokoro-v1.0.onnx` and `voices-v1.0.bin` from the [kokoro-onnx releases](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0), then `venv/bin/python narrate.py --out=out --model=kokoro-v1.0.onnx --voices=voices-v1.0.bin`
3. `NODE_PATH=$(npm root -g) node capture.js --url=http://127.0.0.1:8780/chat --out=out`
4. `ffmpeg -i out/walkthrough.webm -c:v libx264 -crf 27 -pix_fmt yuv420p -an out/picture.mp4`
5. Render the music with bx-audio: `boxlang <bx-audio>/examples/01-pop-drive/pop-drive.bxs --out=out/music.wav --bars=44` (128 BPM)
6. `boxlang mix.bxs --out=out --music=out/music.wav --video=out/picture.mp4 --videoOut=out/walkthrough.mp4`

Start from a fresh `data/` folder (the page keeps conversations and theme there), or the old chats show up in the shots.
