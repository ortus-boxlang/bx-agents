#!/usr/bin/env python3
"""Makes the closing "Next: [Title](file.md)" line of every lesson point at the next lesson of the manifest.

The order of the course is the order of docs/data/courses.yaml, so after a lesson is inserted or moved this script
puts the footers right (and the checker, `tools/course/check-course.bxs`, fails until it has been run).

    python3 tools/course/fix-next.py docs                      # the English lessons
    python3 tools/course/fix-next.py docs/versions/1.0.x       # the versioned mirror
    python3 tools/course/fix-next.py docs/versions/1.0.x/i18n/es docs/versions/1.0.x docs/versions/1.0.x

The second and third arguments are for a translation: the folder whose data/courses.yaml gives the order, and the folder to
take a title from when the lesson is not translated yet (its page falls back to the English one, so the link still lands).
A translated lesson's own word for "Next" (Siguiente) is kept.
"""
import re
import sys
from pathlib import Path


def title_of(path: Path) -> str:
    m = re.search(r'^title:\s*"?(.*?)"?\s*$', path.read_text(encoding="utf-8"), re.M)
    return m.group(1)


def main(docs: Path, manifest: Path, fallback: Path):
    lessons = [l.strip()[2:].strip() for l in (manifest / "data/courses.yaml").read_text().splitlines() if re.match(r"^\s+-\s+course/", l)]
    for i, l in enumerate(lessons):
        path = docs / l
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        word = "Siguiente" if "i18n/es" in str(docs) else "Next"
        m = re.search(r"\n+(Next|Siguiente): \[[^\]]*\]\([^)]*\)\s*$", text)
        if m:
            word = m.group(1)
        text = re.sub(r"\n+(Next|Siguiente): \[[^\]]*\]\([^)]*\)\s*$", "\n", text)
        if i + 1 < len(lessons):
            nxt = lessons[i + 1]
            source = docs / nxt if (docs / nxt).exists() else fallback / nxt
            text = text.rstrip("\n") + "\n\n%s: [%s](%s)\n" % (word, title_of(source), Path(nxt).name)
        path.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    args = [Path(a) for a in sys.argv[1:]] or [Path("docs")]
    docs = args[0]
    main(docs, args[1] if len(args) > 1 else docs, args[2] if len(args) > 2 else docs)
