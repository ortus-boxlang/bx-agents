"""
Speaks every scene of scenes.json with Kokoro (an Apache 2.0 voice model, run offline through kokoro-onnx) and writes
  <out>/<id>.wav   the line, one sentence at a time with short pauses
  <out>/<id>.json  { id, seconds, cues : [ { start, end, text } ] } so the capture holds each scene as long as its line takes

  python3 -m venv venv && venv/bin/pip install kokoro-onnx soundfile
  venv/bin/python narrate.py --out=out --model=kokoro-v1.0.onnx --voices=voices-v1.0.bin [--voice=bf_emma] [--speed=1.0]

The model files are on https://github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0).
"""
import json, os, re, sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

args = dict(a.lstrip("-").split("=", 1) for a in sys.argv[1:])
out = args.get("out", "out")
voice = args.get("voice", "bf_emma")
speed = float(args.get("speed", "1.0"))
os.makedirs(out, exist_ok=True)
kokoro = Kokoro(args.get("model", "kokoro-v1.0.onnx"), args.get("voices", "voices-v1.0.bin"))
scenes = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "scenes.json")))
GAP = 0.32

for scene in scenes:
    pieces, cues, t, rate = [], [], 0.0, 24000
    for sentence in [s for s in re.split(r"(?<=[.!?])\s+", scene["text"]) if s.strip()]:
        samples, rate = kokoro.create(sentence, voice=voice, speed=speed, lang="en-gb")
        seconds = len(samples) / rate
        cues.append({"start": round(t, 3), "end": round(t + seconds, 3), "text": sentence})
        pieces += [samples, np.zeros(int(GAP * rate), dtype=samples.dtype)]
        t += seconds + GAP
    audio = np.concatenate(pieces[:-1])
    sf.write(f"{out}/{scene['id']}.wav", audio, rate)
    json.dump({"id": scene["id"], "seconds": len(audio) / rate, "cues": cues}, open(f"{out}/{scene['id']}.json", "w"))
    print(f"{scene['id']}: {len(audio) / rate:.1f} s")
