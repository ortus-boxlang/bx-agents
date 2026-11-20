"""
Joins the recorded terminal scenes into the silent picture of the trailer, each scene as long as its narration needs, and writes the timeline the mix reads.

  python3 compose.py --out=out

Reads   out/scenes/<id>.mp4         the rendered terminal (record.py)
        out/voice/<id>.json         how long each line takes (narrate.py)
        out/cards/*.png             the cards and caption strips (cards.js)
Writes  out/picture.mp4             1280x720, 30 fps, no sound
        out/timeline.json           [ { id, startMs, seconds, lead, card } ] for mix.bxs

A scene lasts lead + the voice + tail seconds. A recording longer than that is sped up to fit (a scene with "speed": true any amount, any other
up to 2.2 times, and it says so when it needs more); a shorter one holds its last picture.
"""
import json, os, subprocess, sys

here = os.path.dirname(os.path.abspath(__file__))
args = dict(a.lstrip("-").split("=", 1) for a in sys.argv[1:] if "=" in a)
out = os.path.abspath(args.get("out", "out"))
BG = "0x181a21"            # the terminal's own background (themeBg in ../../render.bxs)
W, H, FPS = 1280, 720, 30
TERM_W, TERM_H = 1228, 616
LEAD, TAIL = 0.6, 0.7
seg_dir = os.path.join(out, "segments")
os.makedirs(seg_dir, exist_ok=True)


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(" ".join(cmd), "\n", r.stderr[-800:])
        sys.exit(1)
    return r.stdout


def duration(path):
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]))


def first_content(clip):
    """When the program's own screen first appears: a recording starts with a blank terminal while it loads (up to the render's --max-idle)"""
    out = subprocess.run(["ffmpeg", "-loglevel", "error", "-t", "4", "-i", clip, "-vf", "signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-", "-an", "-f", "null", "-"],
                         capture_output=True, text=True).stdout
    levels = [float(l.split("=")[1]) for l in out.splitlines() if "YAVG" in l]
    fps = 24.0
    for i, y in enumerate(levels):
        if abs(y - levels[0]) > 0.3:
            return max(i / fps - 0.08, 0.0)
    return 0.0


ENC = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p", "-r", str(FPS), "-an"]
timeline, segments, at = [], [], 0.0
for scene in json.load(open(os.path.join(here, "scenes.json"))):
    sid = scene["id"]
    voice = os.path.join(out, "voice", sid + ".json")
    narr = json.load(open(voice))["seconds"] if os.path.exists(voice) else 0.0
    lead = scene.get("lead", 0 if scene.get("card") and not narr else LEAD)
    tail = scene.get("tail", 0 if scene.get("card") and not narr else TAIL)
    want = scene["seconds"] if scene.get("card") and not narr else lead + narr + tail
    seg = os.path.join(seg_dir, sid + ".mp4")
    if scene.get("start"):
        clip = os.path.join(out, "scenes", sid + ".mp4")
        trim = first_content(clip) if scene["start"] in ("chat", "wizard") else 0.0
        have = duration(clip) - trim
        # Long enough to show what is being done: hold up to a second past the voice, then speed the rest up
        total = max(want, min(have, want + 1.0)) if not scene.get("speed") else want
        factor = max(1.0, have / total)
        if factor > (4.0 if scene.get("speed") else 2.2):
            print(f"! {sid}: recording is {have:.1f} s for {total:.1f} s, a speed-up of {factor:.1f}x; shorten its steps")
        cap = os.path.join(out, "cards", "caption-" + sid + ".png")
        filt = (f"[0:v]setpts=PTS/{factor:.4f},fps={FPS},pad={W}:{H}:{(W - TERM_W) // 2}:14:{BG},tpad=stop_mode=clone:stop_duration=60[v0];"
                + (f"[v0][1:v]overlay=0:0:enable='gte(t,0.5)'[v]" if os.path.exists(cap) else "[v0]null[v]"))
        cmd = ["ffmpeg", "-loglevel", "error", "-y", "-ss", str(trim), "-i", clip]
        if os.path.exists(cap):
            cmd += ["-loop", "1", "-framerate", str(FPS), "-i", cap]
        run(cmd + ["-filter_complex", filt, "-map", "[v]", "-t", f"{total:.3f}"] + ENC + [seg])
    else:
        card = os.path.join(out, "cards", sid + ".png")
        total = want
        fade = f"fade=t=in:st=0:d=0.6,fade=t=out:st={max(total - 0.6, 0):.2f}:d=0.6" if sid == "intro" else "fade=t=in:st=0:d=0.8"
        run(["ffmpeg", "-loglevel", "error", "-y", "-loop", "1", "-framerate", str(FPS), "-i", card, "-vf", fade, "-t", f"{total:.3f}"] + ENC + [seg])
    segments.append(seg)
    timeline.append({"id": sid, "startMs": round(at * 1000), "seconds": round(total, 3), "lead": lead, "card": bool(scene.get("card")) and not narr})
    print(f"{sid:9s} start {at:6.1f}  length {total:5.1f}  (voice {narr:4.1f})", flush=True)
    at += total

listing = os.path.join(out, "segments.txt")
open(listing, "w").write("".join(f"file '{s}'\n" for s in segments))
run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", listing, "-c", "copy", os.path.join(out, "picture.mp4")])
json.dump(timeline, open(os.path.join(out, "timeline.json"), "w"), indent=1)
print(f"picture.mp4: {at:.1f} s")
