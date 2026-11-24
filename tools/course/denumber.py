#!/usr/bin/env python3
"""Takes the lesson numbers out of the course pages (docs/course and its mirrors).

The course numbers its lessons itself (the order of docs/data/courses.yaml), so a number written into a title or a
sentence goes wrong the day a lesson is inserted. This script, run once, does the mechanical part:

  - "Lesson 9: Giving Your Agent Tools" in a title becomes "Giving Your Agent Tools"
  - [Lesson 5](05-agent-bx.md) and [Lesson 5 - The Agent Definition](05-agent-bx.md) become links named by the
    lesson's title

What is left (a number in a sentence that is not a link) is printed, to be reworded by hand.

    python3 tools/course/denumber.py docs/course docs/versions/1.0.x/course docs/versions/1.0.x/i18n/es/course
"""
import re
import sys
from pathlib import Path

WORD = r"(?:Lesson|Lessons|Lecci[oó]n|Lecciones)"
TITLE = re.compile(r'^(title:\s*"?)' + WORD + r'\s+\d+\s*[:-]\s*', re.M)
LINK = re.compile(r"\[(" + WORD + r"\s+\d+[^\]]*)\]\(([^)#\s]+\.md)(#[^)]*)?\)")


def lesson_title(folder: Path, name: str) -> str:
    text = (folder / name).read_text(encoding="utf-8")
    m = re.search(r'^title:\s*"?(.*?)"?\s*$', text, re.M)
    t = m.group(1) if m else name
    return re.sub(r"^" + WORD + r"\s+\d+\s*[:-]\s*", "", t)


def main(folders):
    left = []
    for folder in map(Path, folders):
        for path in sorted(folder.glob("*.md")):
            text = path.read_text(encoding="utf-8")
            new = TITLE.sub(r"\1", text)

            def link(m):
                label, target, anchor = m.group(1), m.group(2), m.group(3) or ""
                if not (folder / target).exists():
                    return m.group(0)
                parts = re.split(r"\s+[-:]\s+", label, maxsplit=1)
                name = parts[1] if len(parts) == 2 else lesson_title(folder, target)
                return "[%s](%s%s)" % (name, target, anchor)

            new = LINK.sub(link, new)
            if new != text:
                path.write_text(new, encoding="utf-8")
            for n, line in enumerate(new.splitlines(), 1):
                if re.search(WORD + r"\s+\d", line):
                    left.append("%s:%d: %s" % (path, n, line.strip()))
    if left:
        print("To reword by hand:")
        print("\n".join(left))


if __name__ == "__main__":
    main(sys.argv[1:] or ["docs/course"])
