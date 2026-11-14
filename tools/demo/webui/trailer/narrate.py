"""
Speaks every scene of scenes.json with Kokoro in the tutorial voice (af_heart, see ../../narration/voice.json) and writes
  <out>/<id>.wav   the line, one sentence at a time with short pauses
  <out>/<id>.json  { id, seconds, cues : [ { start, end, text } ] } so the capture holds each scene as long as its line takes

  python3 -m venv venv && venv/bin/pip install kokoro-onnx soundfile
  venv/bin/python -I narrate.py --out=out --folder=<folder with kokoro-v1.0.onnx and voices-v1.0.bin>
"""
import json, os, re, sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

here = os.path.dirname(os.path.abspath(__file__))
voice = json.load(open(os.path.join(here, "..", "..", "narration", "voice.json")))
args = dict(a.lstrip("-").split("=", 1) for a in sys.argv[1:])
out = args.get("out", "out")
folder = args.get("folder", ".")
os.makedirs(out, exist_ok=True)
kokoro = Kokoro(os.path.join(folder, voice["model"]), os.path.join(folder, voice["voices"]))
scenes = json.load(open(os.path.join(here, "scenes.json")))
only = args.get("only")
GAP = 0.32

for scene in scenes:
    if only and scene["id"] not in only.split(","):
        continue
    pieces, cues, t, rate = [], [], 0.0, 24000
    for sentence in [s for s in re.split(r"(?<=[.!?])\s+", scene["text"]) if s.strip()]:
        samples, rate = kokoro.create(sentence, voice=voice["voice"], speed=voice["speed"], lang=voice["language"])
        seconds = len(samples) / rate
        cues.append({"start": round(t, 3), "end": round(t + seconds, 3), "text": sentence})
        pieces += [samples, np.zeros(int(GAP * rate), dtype=samples.dtype)]
        t += seconds + GAP
    audio = np.concatenate(pieces[:-1])
    sf.write(f"{out}/{scene['id']}.wav", audio, rate)
    json.dump({"id": scene["id"], "seconds": len(audio) / rate, "cues": cues}, open(f"{out}/{scene['id']}.json", "w"))
    print(f"{scene['id']}: {len(audio) / rate:.1f} s", flush=True)
