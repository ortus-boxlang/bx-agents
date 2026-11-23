#!/usr/bin/env python3
"""Makes docs/assets/cli-quickstart.svg and cli-doctor.svg from the real output of bxAgents.

    python3 -I tools/demo/terminal/cli-svgs.py <bxAgents command> <docs/assets folder>

The command is the `bxAgents` wrapper that docs-shots.sh leaves in its home folder (<home>/bin/bxAgents). It runs new, build, inspect,
serve and doctor in a scratch folder and draws what they printed as a terminal window. The scratch folder shows as /work, and the data
home as ~/.bxagents. doctor runs with OPENAI_API_KEY set (to a placeholder, which it never prints), as it would be once the key is in place.
"""
import html
import os
import re
import shutil
import subprocess
import sys
import tempfile

bx, out = sys.argv[1], sys.argv[2]
scratch = tempfile.mkdtemp(prefix="svgwork")
project = os.path.join(scratch, "support-bot")
env = {k: v for k, v in os.environ.items() if k != "JAVA_TOOL_OPTIONS"}
env["TERM"] = "dumb"
env["NO_COLOR"] = "1"
home = os.path.dirname(os.path.dirname(bx))


def run(args, cwd, extra=None, first_line=False, timeout=240):
    e = dict(env, **(extra or {}))
    if first_line:
        p = subprocess.Popen([bx] + args, cwd=cwd, env=e, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        line = p.stdout.readline().decode("utf-8")
        p.terminate()
        subprocess.run(["pkill", "-f", "miniserver.json"])
        return line
    r = subprocess.run([bx] + args, cwd=cwd, env=e, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout)
    return r.stdout.decode("utf-8")


def clean(text):
    text = text.replace(scratch, "/work").replace(os.path.join(home, ".bxagents"), "~/.bxagents").replace(home, "~")
    return [l.rstrip() for l in text.splitlines() if not l.startswith("Picked up ") and l.strip() != ""
            or (l == "" and False)]


def lines_keep_blank(text):
    text = text.replace(scratch, "/work").replace(os.path.join(home, ".bxagents"), "~/.bxagents").replace(home, "~")
    return [l.rstrip() for l in text.splitlines() if not l.startswith("Picked up ")]


FONT = "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace"
CH = 8.05


def style(line):
    if re.match(r"^\[ OK \]", line):
        return [("[ OK ] ", "#3fb950", True), (line[7:], "#c9d1d9", False)]
    if re.match(r"^\[WARN\]", line):
        return [("[WARN] ", "#d29922", True), (line[7:], "#c9d1d9", False)]
    if re.match(r"^\W*\s*──", line) or line.startswith("── "):
        return [(line, "#8b949e", False)]
    if line.startswith("✓") or line.startswith("  ✓"):
        return [(line, "#3fb950", False)]
    return [(line, "#c9d1d9", False)]


def svg(path, title, label, rows, width):
    height = 36 + 30 + 22 * len(rows) + 14
    o = []
    o.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" role="img" aria-label="{html.escape(label)}">')
    o.append(f"<title>{html.escape(label)}</title>")
    o.append(f'<rect x="0" y="0" width="{width}" height="{height}" rx="10" fill="#0d1117" stroke="#30363d"/>')
    o.append(f'<path d="M0 10a10 10 0 0 1 10-10h{width - 20}a10 10 0 0 1 10 10v26H0z" fill="#161b22"/>')
    o.append(f'<line x1="0" y1="36" x2="{width}" y2="36" stroke="#30363d"/>')
    for cx, c in ((26, "#ff5f56"), (46, "#ffbd2e"), (66, "#27c93f")):
        o.append(f'<circle cx="{cx}" cy="18" r="5.5" fill="{c}"/>')
    o.append(f'<text x="{width / 2}" y="22.5" fill="#8b949e" font-family="{FONT}" font-size="12" text-anchor="middle">{html.escape(title)}</text>')
    y = 66
    for row in rows:
        if row[0] == "cmd":
            o.append(f'<text x="22.0" y="{y}" fill="#58a6ff" font-family="{FONT}" font-size="13.5" xml:space="preserve">$ </text>')
            o.append(f'<text x="{22 + 2 * CH:.1f}" y="{y}" fill="#e6edf3" font-family="{FONT}" font-size="13.5" font-weight="600" xml:space="preserve">{html.escape(row[1])}</text>')
        else:
            x = 22.0
            for text, color, bold in style(row[1]):
                if text:
                    w = ' font-weight="600"' if bold else ""
                    o.append(f'<text x="{x:.1f}" y="{y}" fill="{color}" font-family="{FONT}" font-size="13.5"{w} xml:space="preserve">{html.escape(text)}</text>')
                x += CH * len(text)
        y += 22
    o.append("</svg>")
    open(path, "w", encoding="utf-8").write("\n".join(o) + "\n")


def fit(rows, width):
    longest = max(len(r[1]) + (2 if r[0] == "cmd" else 0) for r in rows)
    if 22 + longest * CH + 22 > width:
        sys.exit(f"a line is {longest} characters, too wide for {width}px")


# quick start: new, build, inspect, serve
rows = []
cmd = "bxAgents new support-bot --model=openai/gpt-5 --template=webui-chat"
rows += [("cmd", cmd)] + [("out", l) for l in clean(run(cmd.split()[1:] + ["--skipInstall"], scratch))] + [("out", "")]
rows += [("cmd", "bxAgents build")] + [("out", l) for l in clean(run(["build"], project))] + [("out", "")]
rows += [("cmd", "bxAgents inspect --section=agents")] + [("out", l) for l in clean(run(["inspect", "--section=agents"], project))] + [("out", "")]
serve = run(["serve", "--port=8080"], project, first_line=True)
rows += [("cmd", "bxAgents serve --port=8080"), ("out", lines_keep_blank(serve)[0])]
fit(rows, 900)
svg(os.path.join(out, "cli-quickstart.svg"), "bxAgents - from nothing to a running agent",
    "Terminal session: bxAgents new creates a project, bxAgents build assembles a ColdBox app, bxAgents inspect prints the agent and its model, and bxAgents serve starts an HTTP server.", rows, 900)

# doctor
rows = [("cmd", "bxAgents doctor")] + [("out", l) for l in lines_keep_blank(run(["doctor"], project, extra={"OPENAI_API_KEY": "placeholder"})) if True]
while rows and rows[-1] == ("out", ""):
    rows.pop()
fit(rows, 900)
svg(os.path.join(out, "cli-doctor.svg"), "bxAgents doctor",
    "Terminal output of bxAgents doctor: the BoxLang and bx-ai versions, the agent definition, the project structure, the data home that can be written, ending with the number of problems and warnings.", rows, 900)
shutil.rmtree(scratch, ignore_errors=True)
