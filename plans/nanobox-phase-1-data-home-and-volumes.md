# Nanobox foundations, phase 1: data home and volumes

Status: API shape for review. No code yet.

## Decisions so far

- Volumes are host folders only for now. Docker volumes come later with the shell sandbox.
- Budgets are skipped for now.
- The web app is parked until after the foundations.
- Order after this phase: routines and heartbeat, then memory wired by default with recall, then the web app plan.

## Why

Today the only state with a convention is one SQLite file, `data/chat.db`. There is nowhere for the agent's other files, no
way to say which host folders the agent may touch except `toolOptions.bxai.allowedPaths`, and no backup. A deployed app
keeps its database inside the build, so a rebuild can lose it.

## 1. The data home

One folder holds everything an agent keeps.

```
<data home>/
  README.md      what this folder is, written once
  chat.db        conversations, notes, preferences, tokens, usage
  files/         what the agent writes
  skills/        skills waiting for approval (used by a later phase)
  backups/       written by bxAgents backup
```

Where it is, first match wins:

1. The environment variable `BXAGENTS_HOME`.
2. `data.home` in the project's `Agent.yaml`.
3. `./data` in the project folder, in development. A built app has no default: it asks you to set one (see below).

`BXAGENTS_DB` keeps working and still wins for the database file alone.

```yaml
# Agent.yaml
data:
  home: ~/.nanobox        # optional; ~ and relative paths are allowed
```

Rules:

- The folders are created, with the README, the first time the app or `chat` starts. Nothing is created at build time.
- `data/` stays git-ignored in new projects. The ignore line becomes `data/*`.
- A built app that has no `BXAGENTS_HOME` and no `data.home` refuses to start with a message that names both. A silent default inside the build is how data gets lost.
- `bxAgents doctor` prints the data home and whether it is writable.

## 2. Volumes

A volume is a host folder the agent may use, under a name.

```yaml
# Agent.yaml
volumes:
  notes:
    path: ~/Notes
    mode: rw            # rw or ro. ro is the default
  downloads:
    path: ~/Downloads
    mode: ro
```

Every agent also has one implicit volume, `files`, which is `<data home>/files` and is read-write.

Rules checked by `build`:

- A name is lowercase letters, digits and dashes, at most 32 characters. `files` is reserved.
- `path` is absolute, starts with `~`, or is relative to the project. It is resolved at start, not at build.
- A path that does not exist is a warning at build and an error at start.
- Refused: the filesystem root, the user's home folder itself, and the data home itself (its `files/` is already `files`).
- `mode` other than `rw` or `ro` is refused.
- An unknown key under a volume is refused and the valid keys are listed.

How the agent sees them:

- The file tools take paths written `volume:relative/path`, for example `notes:todo.md`. A path with no volume belongs to `files`.
- `ro` volumes give only the read tools. `rw` volumes also give the tools that change files. This uses the split the wizard catalog already makes.
- Under the hood the tool module receives the resolved folders, so `toolOptions.bxai.allowedPaths` is derived from `volumes` and is still accepted. If both are present, `volumes` wins and the build says so.
- A path that climbs out of its volume (`..`, absolute path, symlink to outside) is refused.
- The agent's instructions get one line per volume: its name, its mode and a short description if `description` is set.

## 3. Commands

| Command | What it does |
|---|---|
| `bxAgents data` | Prints the data home, its size per folder and the volumes with their mode |
| `bxAgents backup [--to=FILE]` | Writes a zip of `chat.db` (a consistent copy, safe while the server runs) and `files/` to `backups/` or to `FILE`. Volumes are not included |
| `bxAgents restore FILE` | Replaces `chat.db` and `files/` from a backup. Refuses while a server is using the data home, and keeps the old ones as `*.before-restore` |
| `/volumes` | In chat: lists the volumes |

## 4. API

Two read-only routes, added to `ApiContract` so the OpenAPI document and the BoxLang client follow:

| Route | Returns |
|---|---|
| `GET /data` | `{ home, folders : [ { name, bytes, files } ] }`. Admin only |
| `GET /volumes` | `{ volumes : [ { name, mode, description } ] }`. Never the host path |

Both appear under `capabilities` in `/agent`.

## 5. Tasks

1. `DataHome` class: resolve, create, README, writable check; specs.
2. `data` setting: loader, validator, generated app wiring, startup refusal for a built app; specs.
3. `Volumes` class: parse, validate, resolve, path check including symlinks; specs.
4. Tool module: derive `allowedPaths` and the read-only split from volumes; `volume:path` handling; instruction lines; specs.
5. `data`, `backup`, `restore` verbs and `/volumes`; completions; specs.
6. `GET /data` and `GET /volumes` in `ApiContract`, handler, client; specs.
7. Docs (English, mirror, Spanish), changelog, wizard question for volumes, full suite, one draft pull request.

## Open questions

1. Is `volume:path` the right way to name a path for the agent, or should it keep absolute host paths?
2. Should `restore` also be able to restore into a different data home?
