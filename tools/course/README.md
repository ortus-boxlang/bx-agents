# The course tooling

The course "Introduction to BxAgents" is `docs/course/` (the order is `docs/data/courses.yaml`, mirrored under
`docs/versions/1.0.x/`). Its lessons build one agent, Acme support, on a scripted model that needs no key
(`tools/demo/fakellm.bxs`). This folder keeps the text honest.

| Path | What it is |
| --- | --- |
| `check-course.bxs`, `CourseChecker.bx` | The checker. `boxlang tools/course/check-course.bxs` runs the static checks and then replays every lesson |
| `kit/` | What a learner downloads: the scripted model and its answers (`demos/model.json`), `resume.sh` and the checkpoints |
| `kit/checkpoints/<lesson>/` | The project's files after each lesson that changes them (made by the checker, never by hand) |
| `build-kit.sh` | Zips `kit/` into `docs/assets/course/bxagents-course-kit.zip` (the docs workflow runs it; the zip is not committed) |
| `denumber.py`, `fix-next.py` | One-time clean-up of lesson numbers, and the script that rewrites each lesson's closing `Next:` line from the manifest |

## Numbering

A lesson's number is its place in `docs/data/courses.yaml` and nothing else. Existing files keep their `NN-slug.md` names
(so URLs, saved progress and translations survive an insertion); a new lesson gets a plain topic slug. Titles and prose
never say "Lesson 7": name the lesson and link it. After inserting or moving a lesson, run
`python3 tools/course/fix-next.py docs` (and the same for `docs/versions/1.0.x`) and update `STAGES` in
`docs/.theme/assets/agents-home.js`; the checker fails until both agree with the manifest.

## Writing a lesson

A fenced block with a `title` is part of the replay; one without is illustration.

| Block | Title | The checker |
| --- | --- | --- |
| Command | `bash` with `title="Terminal 2"` | runs it (`set -e`), in the workspace `~/bxagents-course` of a throwaway `HOME` |
| Output | `text` with `title="You see"` right after a command | compares line by line; `...` alone matches any lines, `<anything>` matches text inside a line |
| File | any language, `title="acme-support/Agent.yml"` (a path from the workspace) | writes it; `<!-- course: append -->` before it adds to the file instead |

Directives are HTML comments on the line before a block: `manual` (shown, never run), `expect-fail`, `network` (needs the
internet, skipped unless `--network`), `java-launcher` (a quoted flag value with spaces is allowed), `background name=x
ready="text" ready-url=http://...` (a server; `keep` keeps it after the lesson) and `wait name=x until="text" seconds=90`.
Flag values in a command never contain spaces (the BoxLang 1.19.0 launcher splits them), so the scripted model's rules
listen for single words. See the header of `CourseChecker.bx`.

## Running it

```bash
boxlang tools/course/check-course.bxs --static            # seconds, no processes
boxlang tools/course/check-course.bxs                     # the replay, about 15 minutes
boxlang tools/course/check-course.bxs --lesson=approvals  # one lesson, from the checkpoint of the lesson before
boxlang tools/course/check-course.bxs --emit-checkpoints  # rewrite kit/checkpoints from what the lessons produce
```

It needs `bxAgents` (or `--bxagents="boxlang module:bxagents"`) with the module built (`./gradlew shadowJar
createModuleStructure`, then `BOXLANG_HOME` with that module), `boxlang-miniserver`, and ports 8080 and 8791 free (inside
a private network namespace, for example `unshare -n`, if they are not). `--lesson` and `--from` start from a checkpoint,
which holds the project's files and not the data home (notes, routines, tokens), so a lesson that continues earlier
data-home state (`routines-and-reports` continues `approvals`, `operating-it` needs notes) is replayed with `--from=` the
lesson that makes it. The lesson `testing-your-agent` needs the internet for `box install`, so it is skipped without
`--network`.
