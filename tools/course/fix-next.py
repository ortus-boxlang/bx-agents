#!/usr/bin/env python3
"""Makes the closing "Next: [Title](file.md)" line of every lesson point at the next lesson of the manifest.

The order of the course is the order of docs/data/courses.yaml, so after a lesson is inserted or moved this script
puts the footers right (and the checker, `tools/course/check-course.bxs`, fails until it has been run).

    python3 tools/course/fix-next.py [docs]            # docs, or docs/versions/1.0.x
"""
import re
import sys
from pathlib import Path


def main(docs: Path):
    lessons = [l.strip()[2:].strip() for l in (docs / "data/courses.yaml").read_text().splitlines() if re.match(r"^\s+-\s+course/", l)]
    titles = {}
    for l in lessons:
        text = (docs / l).read_text(encoding="utf-8")
        m = re.search(r'^title:\s*"?(.*?)"?\s*$', text, re.M)
        titles[l] = m.group(1)
    for i, l in enumerate(lessons):
        path = docs / l
        text = path.read_text(encoding="utf-8")
        text = re.sub(r"\n+Next: \[[^\]]*\]\([^)]*\)\s*$", "\n", text)
        if i + 1 < len(lessons):
            nxt = lessons[i + 1]
            text = text.rstrip("\n") + "\n\nNext: [%s](%s)\n" % (titles[nxt], Path(nxt).name)
        path.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main(Path(sys.argv[1] if len(sys.argv) > 1 else "docs"))
