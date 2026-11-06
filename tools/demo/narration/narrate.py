"""Turns a narration file into one wav per scene, in the tutorial voice (see voice.json).

    python narrate.py <kokoro-folder> <narration.json> <out-folder>

<kokoro-folder> holds the model and voices files named in voice.json. <narration.json> maps a scene
name to its text. Each scene becomes <out-folder>/<name>.wav; the length of the wav is the length
the scene's video should have.

Setup: python3 -m venv venv && venv/bin/pip install kokoro-onnx soundfile, then download
kokoro-v1.0.onnx and voices-v1.0.bin from the kokoro-onnx model-files-v1.0 release.
"""
import json, os, sys
import soundfile as sf
from kokoro_onnx import Kokoro

here = os.path.dirname(os.path.abspath(__file__))
voice = json.load(open(os.path.join(here, "voice.json")))
folder, narration, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
kokoro = Kokoro(os.path.join(folder, voice["model"]), os.path.join(folder, voice["voices"]))
for name, text in json.load(open(narration)).items():
    samples, rate = kokoro.create(text, voice=voice["voice"], speed=voice["speed"], lang=voice["language"])
    sf.write(os.path.join(out, name + ".wav"), samples, rate)
    print(name, round(len(samples) / rate, 1), "s")
