# Demo recording kit

Scripts for making a recording of `bxAgents chat` (or any terminal program) that comes out the same
every time: a GIF or MP4 for the docs, a release note or a bug report. Everything is BoxLang (`.bxs`),
except what BoxLang cannot do alone (opening a pseudo terminal and encoding video), which is borrowed
from the system.

| File | What it does |
| --- | --- |
| `make-demo.bxs` | The whole thing in one command: scaffold and build a demo agent, start the scripted model, type the chat, record it, render it |
| `fakellm.bxs` | A scripted stand-in for an AI model that speaks the OpenAI chat protocol, so a demo needs no API key and always says the same thing |
| `drive.bxs` | Runs a command in a pseudo terminal and types at it from a JSON script |
| `render.bxs` | Turns an asciicast (`.cast`) into a GIF and an MP4 |
| `VtScreen.bx` | The terminal screen `render.bxs` draws from. Its spec is `tests/specs/tools/VtScreenSpec.bx` |
| `demos/chat.json` | The keystrokes of the default chat demo |
| `demos/model.json` | The canned answers of the scripted model |

## What you need

- BoxLang, with the bxAgents module installed for it.
- `ffmpeg` on the PATH, to make the video. Without it the frames are still written as PNGs.
- `script`, for the pseudo terminal. It ships with Linux (util-linux) and macOS. Only Linux has been tried.
  There is no `script` on Windows.
- Port 8080 free: the demo agent uses the `openai-compatible` provider, whose default address is
  `http://localhost:8080/v1`.

## Make the default demo

```bash
boxlang tools/demo/make-demo.bxs --out=demo-out
```

It takes about a minute to type the chat and half a minute to render. In `demo-out` you get
`session.cast` (written by `chat --record` itself), `demo.gif` and `demo.mp4`. The `.cast` also plays
in a terminal with `asciinema play`.

`--boxlang` is the command that runs BoxLang (default `boxlang`). Use it to point at a particular jar, and
`--home` to keep the demo out of your own `~/.boxlang`:

```bash
boxlang tools/demo/make-demo.bxs --out=demo-out \
  --boxlang="java -cp boxlang.jar ortus.boxlang.runtime.BoxRunner --bx-config /abs/path/boxlang.json" \
  --home=/tmp/demo-home
```

The answers come from `demos/model.json`, so the demo shows how the chat looks, not what a real model
says.

## Change what the demo types

Copy `demos/chat.json` and edit the steps, then pass it with `--spec`:

```bash
boxlang tools/demo/make-demo.bxs --spec=my-demo.json
```

| Step | Does |
| --- | --- |
| `{ "expect": "text", "max": 60, "then": 2 }` | Wait until the text appears on screen (up to `max` seconds), then wait `then` more |
| `{ "type": "hello" }` | Type the characters one at a time (`typeMs` apart) |
| `{ "press": "enter", "after": 500 }` | Press a key: `enter`, `tab`, `esc`, `backspace`, `up`, `down`, `left`, `right`, `ctrl-c`, `ctrl-d`. `after` is a pause in milliseconds |
| `{ "wait": 2 }` | Wait, in seconds |

Match on words that are on screen when the step should run. `expect` ignores colors and cursor moves.

To change the model's answers, copy `demos/model.json` and run `fakellm.bxs --script=...` yourself, or edit
the file. A rule matches when the user's last message contains `when`; with `tool`, the model calls that tool
first and answers once the result is back.

## Use the pieces on their own

```bash
# Drive any program in a terminal and save what it showed
boxlang tools/demo/drive.bxs spec.json

# Turn a recording from `chat --record`, asciinema or drive.bxs into video
boxlang tools/demo/render.bxs session.cast out --fps=12 --max-idle=2 --formats=gif

# Run the scripted model by itself (Ctrl+C or POST /__stop to stop it)
boxlang tools/demo/fakellm.bxs --port=8080
```

`render.bxs` cuts any pause longer than `--max-idle` seconds (default 2) so a recording that waited for a slow
model does not make a slow video. `--font=<ttf>` picks a font file; the default is Java's `Monospaced`, which
covers box drawing, spinners and check marks on most systems.

## Limits

- The video is a rendering of the recording with its own colors and font, not a capture of a real terminal.
- `VtScreen` handles what text programs use (cursor moves, colors, erasing, scrolling, wide characters). It is not
  a complete VT100, so a program that draws on the alternate screen with unusual sequences may not render right.
- `drive.bxs` passes the command's arguments through the JVM, which mangles non-ASCII characters in a command line
  when the locale is not UTF-8 (set `LANG=C.UTF-8`). Typed text is not affected.
