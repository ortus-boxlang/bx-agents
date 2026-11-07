---
title: data and volumes
icon: phosphor-duotone:database
summary: One folder for everything an agent keeps, named folders it may use, and backups of both.
description: One folder for everything an agent keeps, named folders it may use, and backups of both.
tags: [conventions, data]
---

# Data and volumes

An agent keeps its state in one place, the **data home**, and reaches the rest of your machine only through **volumes**: folders you name in `Agent.yaml`. `bxAgents data` shows both, and `bxAgents backup` and `restore` keep the data safe.

## The data home

```text
<data home>/
  README.md      what this folder is, written once
  chat.db        conversations, notes, access tokens, secrets and usage counts
  files/         what the agent writes (the `files` volume)
  skills/        skills the agent saves
  backups/       written by bxAgents backup
```

Where it is, first match wins:

1. The environment variable `BXAGENTS_HOME`.
2. `data.home` in `Agent.yaml`.
3. The folder of `BXAGENTS_DB` when that names a file called `chat.db` (what `serve` and `chat` set).
4. `data/` in the project, or `data/` inside a built app.

```yaml
# Agent.yaml
data:
  home: ~/.nanobox      # an absolute path, one starting with ~, or one relative to the project
```

`BXAGENTS_DB` keeps working and names the database file on its own.

The folders and the README are made the first time the app or `chat` starts. Nothing is made just by asking where the home is.

!!! warning
    A built app that has no home chosen keeps its data in `data/` inside the app, and says so when it starts. A new build can then replace it. Set `BXAGENTS_HOME` where the app runs, or `data.home`, to keep it outside.

## Volumes

A volume is a folder on this machine that the agent's file tools may use, under a name.

```yaml
# Agent.yaml
volumes:
  notes:
    path: ~/Notes
    mode: rw                 # rw (read and write) or ro (read only, the default)
    description: My notes    # optional, up to 200 characters
  downloads:
    path: ~/Downloads
```

Every agent also has `files`: the `files/` folder of its data home, always read and write.

| Rule | Detail |
|---|---|
| Names | Lowercase letters, digits and dashes, 1 to 32 characters. `files` is taken. At most 32 volumes |
| `path` | Absolute, starting with `~`, or relative to the project. It must exist when the app starts |
| Too wide | The whole disk or the whole home folder is refused. So is the data home itself |
| Keys | `path`, `mode`, `description`. Anything else is refused |
| When | Volumes are fixed when the app starts. The agent cannot add one, and neither can an API |

An agent that lists bx-ai's file tools (`readFile@bxai`, `writeFile@bxai`, and so on) gets the project's volumes with no further setting. An agent that sets `toolOptions.bxai.allowedPaths` itself keeps those full paths instead, and cannot also use volumes.

### How the agent sees them

The agent writes a path as `volume:path`, for example `notes:todo.md`. A path with no volume is in `files`.

- A full path on the machine is refused, and so is anything that climbs out of its volume with `..` or a symbolic link.
- A read only volume can be read, listed and copied from, but not written to, moved, or deleted from.
- Results and error messages name volumes. The agent never sees where a volume is on the machine.
- `listAllowedDirectories` answers with the volumes, their modes and their descriptions.

## `bxAgents data`

```bash
bxAgents data [--json]
```

Prints the data home and where it came from, the size of the database and each folder, and the volumes with their modes.

## Backups

```bash
bxAgents backup [--to=FILE]
bxAgents restore FILE [--home=DIR] [--force]
```

`backup` writes one zip with the chat database, `files/` and `skills/`, plus a small `backup.json`. Without `--to` it goes in the home's `backups/` folder as `backup-<date>-<time>.zip`. The database is copied whole with SQLite's own `VACUUM INTO`, so it is safe to run while a server is using it. Volumes are not included: they are your folders.

`restore` puts a backup back. What was there is kept beside it as `chat.db.before-restore`, `files.before-restore` and `skills.before-restore` for one restore; the next restore replaces them. It stops when a server or chat looks to have the database open (SQLite leaves a `-wal` file while one does), unless you pass `--force`. `--home` restores into another data home. A zip with an entry that is not part of a backup, or that tries to leave the home, is refused before anything is changed.
