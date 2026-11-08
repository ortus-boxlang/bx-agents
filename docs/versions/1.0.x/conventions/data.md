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
  chat.db        conversations and the agents' memory of them, notes, access tokens, secrets and usage counts
  files/         what the agent writes (the `files` volume)
  skills/        skills the agent saves
  backups/       written by bxAgents backup
```

There is always a home. Where it is, first match wins:

1. The environment variable `BXAGENTS_HOME`.
2. `data.home` in `Agent.yaml`.
3. The folder of `BXAGENTS_DB` when that names a file called `chat.db` (what `serve` and `chat` set).
4. `data/` in the project, when it already holds a `chat.db`. A project from before this convention keeps its data.
5. **`~/.bxagents/<agent name>`**, the convention. It is outside the project and outside the build, so a new build never replaces it, and it is the same place in development and when deployed.
6. `data/` in the project, only for an agent that has no name.

```yaml
# Agent.yaml
name: nanobox
data:
  home: ~/.nanobox      # an absolute path, one starting with ~, or one relative to the project
```

`BXAGENTS_DB` keeps working and names the database file on its own.

The agent name is turned into a safe folder name: letters, digits, dots, dashes and underscores, the rest become a dash. Two projects with the same agent name share one home, so give them different names, or set `data.home` on one.

The folders and the README are made the first time the app or `chat` starts. Nothing is made just by asking where the home is.

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

### Seeing them

- **In chat:** `/volumes` lists the volumes by name, mode and description, in the terminal, the web page and chat apps. It never shows a folder on the machine.
- **Over the API:** `GET /volumes` answers the same list to anyone who may call the API. `GET /data` answers the data home, the size of each part and the folder of each volume, and is for admins only, since it shows paths.
- **In `doctor`:** it reports the data home, where it came from, and whether it can be written. It makes nothing.

## Skills the agent saves

A skill is a folder with a `SKILL.md`: instructions the agent loads by name when a task calls for them. There are three levels:

| Level | Where | Written by | `origin` |
|---|---|---|---|
| Installed | `.agents/skills/` in the project | The registry tools (`npx skills`, `bxAgents skills install`), restored at build time | `installed` |
| Ships with the agent | `skills/` in the project, and the skills extensions carry | You | `project` |
| The agent's own | `skills/` in the data home | The agent, with its `saveSkill` tool | `agent` |

The build copies the first two into the app, and the app loads the third at start and the moment a skill is saved. A skill that ships with the agent wins over an installed one of the same name.

After a task that took real steps and is likely to come up again, the root agent can call `saveSkill( name, description, content )`. The skill is written to the data home and is in the agent's skill list at once, with no restart. Subagents are given the skills when they are built; they cannot save any.

- **The first two levels win.** The agent cannot take the name of an installed skill or one that ships with the agent, or replace it. It can save over a skill it wrote itself, to improve it.
- **Approval.** Each save is approved by a person, as for any tool that needs approval, unless `skills.autoApprove: true`.
- **Limits.** A name is a folder name (letters, digits, `.`, `_`, `-`). A description is up to 500 characters and the content up to 20,000. The agent keeps up to 50 skills; saving over one it has is always allowed.
- **Off switch.** `skills.agentCanSave: false` takes the tool away.

```yaml
skills:
  agentCanSave: true     # default true; the root agent only
  autoApprove: false     # default false
```

A saved skill is part of the data home, so `backup` and `restore` carry it. To remove one, delete its folder.

### Seeing the skills

- **In chat:** `/skills` lists every skill with its level: installed, project or agent.
- **Over the API:** `GET /skills` answers `{ skills: [ { name, description, origin } ] }` (`origin` is `installed`, `project` or `agent`) to anyone who may call the API. It never shows a folder on the machine.

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
