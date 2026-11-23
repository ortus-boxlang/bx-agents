# Terminal UI trailer

Makes `docs/assets/video/terminal-trailer.mp4` (with `.webm`, `.vtt` captions and `-poster.png`), the narrated trailer of the terminal chat and the `new` wizard. It runs about 2 minutes 15: an intro card, one scene per feature, and a closing card with the call to action.

Everything runs offline, the way [the web trailer](../../webui/trailer/README.md) does: the model is scripted (`../../fakellm.bxs` with `model.json`), the voice is [Kokoro](https://github.com/thewh1teagle/kokoro-onnx) (the same `../../narration/voice.json`), the music and mix are [bx-audio](https://github.com/ortus-boxlang/bx-audio) and the cards are drawn with [bx-playwright](https://bxplaywright.boxlang.io). The terminal is real: every scene is `bxAgents chat` (or `new`) driven in a pseudo terminal by `../../drive.bxs` and drawn by `../../render.bxs`.

| File | What it does |
| --- | --- |
| `scenes.json` | One entry per scene: the narration (`text`), the caption on the picture, and the keystrokes (`steps`, in the format of `../../drive.bxs`). `start` is `chat`, `shell` (a bash prompt, then you type the command) or `wizard`; `card` makes a scene with no terminal |
| `model.json` | The scripted answers. It starts from the web trailer's and adds `summarise` |
| `record.bxs` | Records and renders each scene in its own pseudo terminal, so the screen starts clean. Builds the demo agent (`../../webui/trailer/project`), makes it a git repository and writes a `bxAgents` command |
| `voice.bxs` | The voice-over. Sends each sentence to the shared `../../narration/narrate.py` (Kokoro `af_heart`, the voice of every demo video), joins the sentences with a short pause and writes `<id>.wav` and `<id>.json` (the length and the caption cues) with bx-audio |
| `cards.bxs` | Draws the intro card, the closing card and the caption strips with bx-playwright, from the HTML in `templates/` |
| `compose.bxs` | Fits each scene to the length of its line (speeding a long recording up to 2.2 times, holding the last picture of a short one), trims the blank screen while a chat starts, joins the scenes with ffmpeg and writes `timeline.json` |
| `mix.bxs` | Levels each line, places it at its scene, fits the music to the picture, ducks it under the voice, masters, writes the captions and muxes. The web trailer's, writing `terminal-trailer.vtt` |

Everything is BoxLang except the speech engine: Kokoro only exists for Python, so `voice.bxs` runs the shared `narrate.py`. bx-audio has its own `audioSpeak`, but with Piper voices, which are a different voice.

## Steps

You need BoxLang with the bxAgents module built (`./gradlew shadowJar`, the module is `build/modules/bxagents`), the BoxLang jar the build used, `ffmpeg`, `script`, and the bx-audio and bx-playwright modules (`install-bx-module bx-audio bx-playwright`, then `bxplaywright install` for the browser). Python is only for the voice: `python3 -m venv venv && venv/bin/pip install kokoro-onnx soundfile`, and the `kokoro-v1.0.onnx` and `voices-v1.0.bin` files from the [kokoro-onnx releases](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0). Port 8080 must be free.

1. Record the scenes. The first run builds the demo agent. `--home` is the "user's" home: a short one such as `/home/dev` keeps the paths in `/export` and `/record` short, and the folder in the prompt reads `~/acme-support`. Clear `<home>/.bxagents` first, or the notes and the vault already hold what the scene adds.
   ```bash
   boxlang record.bxs --boxlang-jar=<boxlang.jar> --module=<build/modules/bxagents> --out=out --home=/home/dev
   boxlang record.bxs ... --only=memory     # one scene again
   ```
2. The voice: `boxlang voice.bxs --out=out/voice --kokoro=<where the two Kokoro files are> --python=<venv>/bin/python`
3. `boxlang cards.bxs --out=out`
4. `boxlang compose.bxs --out=out` writes `out/picture.mp4` and `out/timeline.json` (and copies the timeline into `out/voice`, where the mix looks). It says so when a scene needs more than a 2.2 times speed-up: shorten its steps in `scenes.json`
5. The music, a synthwave track of 52 bars at 100 BPM (the mix cuts it to the picture): `boxlang <bx-audio>/examples/06-synthwave/synthwave.bxs --out=out/music.wav --bars=52 --bpm=100`
6. `boxlang mix.bxs --out=out/voice --music=out/music.wav --video=out/picture.mp4 --videoOut=out/mixed.mp4`
7. `ffmpeg -i out/mixed.mp4 -c:v copy -c:a aac -b:a 96k -movflags +faststart terminal-trailer.mp4`, then `ffmpeg -i terminal-trailer.mp4 -c:v libvpx-vp9 -crf 34 -b:v 0 -c:a libopus -b:a 64k terminal-trailer.webm`. The captions are `out/voice/terminal-trailer.vtt`. The poster is a frame of the chat scene with the code block.

## Things worth knowing

- Several screens only have something to show in a served agent: `/logs` and `/routines` are empty in an in-process chat, so the trailer leaves them out.
- A recording started from a shell prompt leaves part of the typed command visible when the wizard draws its header over it, so the wizard scene starts the wizard directly.
- Render one recording at a time. Two renders sharing one BoxLang home crashed with `Color parameter outside of expected range`.
- The first blank screen of a chat (the program starting) lasts up to the render's `--max-idle`; `compose.bxs` finds where the real screen begins and cuts the blank part.
