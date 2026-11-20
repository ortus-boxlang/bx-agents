"""
Records every terminal scene of scenes.json, each in its own pseudo terminal so the screen starts clean, and renders it to out/scenes/<id>.mp4.

  python3 record.py --boxlang-jar=<boxlang.jar> --module=<built module folder> --out=out [--work=<scratch folder>] [--only=hook,chat] [--fps=24]

It needs the demo agent from ../../webui/trailer/project, the scripted model (../../fakellm.bxs with model.json), `script` for the pseudo
terminal and ffmpeg. Port 8080 must be free: the demo agent's profiles use the `openai-compatible` provider.
"""
import json, os, shutil, subprocess, sys, time

here = os.path.dirname(os.path.abspath(__file__))
demo = os.path.abspath(os.path.join(here, "..", ".."))
args = dict(a.lstrip("-").split("=", 1) for a in sys.argv[1:] if "=" in a)
jar = os.path.abspath(args["boxlang-jar"])
module = os.path.abspath(args["module"])
out = os.path.abspath(args.get("out", "out"))
work = os.path.abspath(args.get("work", os.path.join(out, "work")))
only = args["only"].split(",") if "only" in args else None
fps = args.get("fps", "24")
COLS, ROWS = 120, 28

home = os.path.abspath(args["home"]) if "home" in args else os.path.join(work, "home")   # the "user's" home: the prompt reads ~/acme-support and paths stay short
project = os.path.join(home, "acme-support")
bin_dir = os.path.join(home, "bin")
bx_home = os.path.join(work, "boxlang-home")
env = {k: v for k, v in os.environ.items() if k != "JAVA_TOOL_OPTIONS"}
env.update({"BOXLANG_HOME": bx_home, "HOME": home})
BL = ["java", "-Duser.name=dev", "-Duser.home=" + home, "-cp", jar, "ortus.boxlang.runtime.BoxRunner"]


def sh(cmd, **kw):
    return subprocess.run(cmd, env=env, capture_output=True, text=True, **kw)


def setup():
    """The module installed for a fresh BoxLang home, the demo agent built, a git repository for the git widget, and a `bxAgents` command."""
    if os.path.isdir(work) and "fresh" in args:
        shutil.rmtree(work)
    os.makedirs(os.path.join(bx_home, "modules"), exist_ok=True)
    target = os.path.join(bx_home, "modules", "bxagents")
    if not os.path.isdir(target):
        shutil.copytree(module, target)
    open(os.path.join(bx_home, "boxlang.json"), "w").write('{ "whitespaceCompressionEnabled": false }')
    if not os.path.isdir(project):
        shutil.copytree(os.path.join(demo, "webui", "trailer", "project"), project)
        sh(BL + ["module:bxagents", "build", "--projectRoot=" + project])
        for g in (["git", "init", "-q", "-b", "main"], ["git", "add", "-A"],
                  ["git", "-c", "user.name=dev", "-c", "user.email=dev@acme.test", "commit", "-qm", "Add the support agent"]):
            subprocess.run(g, cwd=project, capture_output=True)
    os.makedirs(bin_dir, exist_ok=True)
    wrapper = os.path.join(bin_dir, "bxAgents")
    open(wrapper, "w").write('#!/bin/sh\nexec env -u JAVA_TOOL_OPTIONS BOXLANG_HOME="%s" HOME="%s" %s module:bxagents "$@"\n' % (bx_home, home, " ".join(BL)))
    os.chmod(wrapper, 0o755)
    os.makedirs(os.path.join(home, "new"), exist_ok=True)


def drive(scene):
    kind = scene.get("start", "chat")
    steps = []
    if kind == "chat":
        cmd, cwd = BL + ["module:bxagents", "chat", "--projectRoot=" + project], project
        steps = [{"expect": "enter send", "max": 120, "then": 1.2}]
    elif kind == "wizard":
        shutil.rmtree(os.path.join(home, "new"), ignore_errors=True)
        os.makedirs(os.path.join(home, "new"))
        cmd, cwd = BL + ["module:bxagents", "new", "support-bot", "--skipInstall"], os.path.join(home, "new")
        steps = [{"expect": "What do you want to call", "max": 90, "then": 1.0}]
    else:
        cwd = project
        rc = os.path.join(work, "bashrc-" + kind)
        open(rc, "w").write("PS1='\\[\\e[32m\\]dev@acme\\[\\e[0m\\] \\[\\e[34m\\]~/acme-support\\[\\e[0m\\] $ '\n")
        cmd = ["bash", "--rcfile", rc, "-i"]
        steps = [{"expect": "$ ", "max": 20, "then": 0.6}]
    spec = {"title": scene["id"], "cols": COLS, "rows": ROWS, "typeMs": scene.get("typeMs", 48), "command": cmd, "cwd": cwd,
            "env": {"BOXLANG_HOME": bx_home, "HOME": home, "PATH": bin_dir + ":" + env["PATH"]},
            "output": os.path.join(out, "scenes", scene["id"] + ".cast"), "steps": steps + scene.get("steps", [])}
    path = os.path.join(out, "scenes", scene["id"] + ".json")
    json.dump(spec, open(path, "w"), indent=1)
    r = sh(BL + [os.path.join(demo, "drive.bxs"), path], timeout=900)
    return r.stdout.strip().splitlines()[-1:] + r.stderr.strip().splitlines()[-1:]


def render(scene):
    d = os.path.join(out, "scenes", scene["id"])
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d)
    r = sh(BL + [os.path.join(demo, "render.bxs"), os.path.join(out, "scenes", scene["id"] + ".cast"), d,
                 "--size=16", "--fps=" + fps, "--max-idle=1.2", "--hold=0", "--formats=mp4"], timeout=1800)
    shutil.move(os.path.join(d, "demo.mp4"), os.path.join(out, "scenes", scene["id"] + ".mp4"))
    shutil.rmtree(d, ignore_errors=True)
    return r.stdout.strip().splitlines()[-2:]


os.makedirs(os.path.join(out, "scenes"), exist_ok=True)
setup()
scenes = [s for s in json.load(open(os.path.join(here, "scenes.json"))) if s.get("start") and (not only or s["id"] in only)]
model = subprocess.Popen(BL + [os.path.join(demo, "fakellm.bxs"), "--port=8080", "--script=" + os.path.join(here, "model.json")],
                         cwd=out, stdout=open(os.path.join(out, "fakellm.log"), "w"), stderr=subprocess.STDOUT, env=env)
time.sleep(10)
try:
    for scene in scenes:
        print(scene["id"], "recording", flush=True)
        print("  ", drive(scene), flush=True)
        print("  ", render(scene), flush=True)
finally:
    model.terminate()
