# Nanobox foundations, phase 1: data home, volumes, skills and memory

Status: API shape for review. No code yet.

## Decisions so far

- Volumes are host folders only for now, and the agent names them, never full paths.
- `restore` restores into the data home by default, with an optional `--home`.
- The data home holds the skills the agent creates. Skills written by hand and seeded at build stay in the project.
- Memory defaults to bx-ai's `jdbc` memory on the data home's `chat.db`, with a limit of 500 messages per conversation, configurable.
- At the limit, older messages are summarised by default, not dropped. `/compact` does the same on request.
- Volumes are fixed when the server starts. Nothing adds one at run time: not the agent, not the API.
- Budgets are skipped, and the web app is parked.
- Order after this phase: routines and heartbeat, then recall and the proposed-notes review, then the web app plan.
- Principle: consistency. One id names a conversation everywhere, and one class changes it everywhere.

## Why

Today the only state with a convention is one SQLite file, `data/chat.db`. There is nowhere for the agent's other files, no
way to say which host folders the agent may touch except `toolOptions.bxai.allowedPaths`, and no backup. A deployed app
keeps its database inside the build, so a rebuild can lose it. The `conversations` table lists conversations, but the
messages live in whatever memory the agent has, and by default that is `window`: in the server's memory, lost on restart.

## 1. The data home

One folder holds everything an agent keeps.

```
<data home>/
  README.md      what this folder is, written once
  chat.db        conversations, messages, notes, preferences, tokens, usage
  files/         what the agent writes
  skills/        skills the agent creates
  backups/       written by bxAgents backup
```

Where it is, first match wins:

1. The environment variable `BXAGENTS_HOME`.
2. `data.home` in the project's `Agent.yaml`.
3. `./data` in the project folder, in development. A built app has no default: it asks you to set one.

`BXAGENTS_DB` keeps working and still wins for the database file alone.

```yaml
# Agent.yaml
data:
  home: ~/.nanobox        # optional; ~ and relative paths are allowed
```

Rules:

- The folders are created, with the README, the first time the app or `chat` starts. Nothing is created at build time.
- `data/` stays git-ignored in new projects. The ignore line becomes `data/*`.
- A built app that has no `BXAGENTS_HOME` and no `data.home` refuses to start with a message that names both.
- `bxAgents doctor` prints the data home and whether it is writable.

## 2. Volumes

A volume is a host folder the agent may use, under a name. The agent only ever sees the name.

```yaml
# Agent.yaml
volumes:
  notes:
    path: ~/Notes
    mode: rw            # rw or ro. ro is the default
    description: My notes   # optional, shown to the agent
  downloads:
    path: ~/Downloads
    mode: ro
```

Every agent also has one implicit volume, `files`, which is `<data home>/files` and is read-write.

Rules checked by `build`:

- A name is lowercase letters, digits and dashes, at most 32 characters. `files` is reserved.
- `path` is absolute, starts with `~`, or is relative to the project. It is resolved at start, not at build.
- A path that does not exist is a warning at build and an error at start.
- Refused: the filesystem root, the user's home folder itself, and the data home itself.
- `mode` other than `rw` or `ro` is refused. An unknown key is refused and the valid keys are listed.

How the agent sees them:

- The file tools take paths written `volume:relative/path`, for example `notes:todo.md`. A path with no volume belongs to `files`. A full host path is refused.
- `ro` volumes give only the read tools. `rw` volumes also give the tools that change files, using the split the wizard catalog already makes.
- The tool module receives the resolved folders, so `toolOptions.bxai.allowedPaths` is derived from `volumes` and is still accepted. If both are present, `volumes` wins and the build says so.
- A path that climbs out of its volume (`..`, absolute path, symlink to outside) is refused.
- The agent's instructions get one line per volume: its name, its mode and its description.

## 3. Skills

Two places, two jobs:

| Place | Written by | Loaded |
|---|---|---|
| `skills/` in the project (and `.agents/skills/`) | You, or installed with `bxAgents skills install` | Copied into the build, as today |
| `<data home>/skills/` | The agent, with a new `saveSkill` tool | Read from the data home at start and when a skill is saved |

- A skill the agent creates is a folder with a `SKILL.md`, like any other. The tool refuses a name that a project skill already uses, so the agent cannot replace one of yours.
- Both sets are given to each agent as its available skills. The agent loads one by name when it needs it. This is what makes sure the agent uses them: they are in its skill list, and the instructions say a skill can be saved after a task that was worth repeating.
- Saving a skill needs approval unless `skills.autoApprove: true`. Until a later phase adds the review step, "approval" is the existing tool approval.
- bx-ai reads one skills folder, fixed at start. We pass the combined list per agent instead. Whether a skill saved while the server runs is picked up without a restart is to be checked in the spike (task 5).

## 4. Memory

### What changes

| | Today | After this phase |
|---|---|---|
| Default type | bx-ai `window` (in the process), or `session` for a web UI project | `jdbc`, in the data home's `chat.db` |
| Where messages live | In the memory object only | The `bx_ai_memories` table, one row per conversation |
| Limit | 100 messages for `window` | 500 per conversation, configurable |
| Survives a restart | Only if you configure `file` or `jdbc` | Yes |

### Linking messages to conversations

bx-ai's `jdbc` memory stores one row per memory key, with `user_id`, `conversation_id` and the message list as JSON. We use
the same ids as the `conversations` table: `conversations.userId` is `user_id` and `conversations.id` is
`conversation_id`.

For consistency, `Conversations` (which already owns rename, fork, delete and export) becomes the only code that changes
both the `conversations` row and its memory row:

- Delete a conversation: both rows go, in one transaction.
- Fork: the memory row is copied under the new id.
- Clear: the messages go, the conversation stays.
- `messageCount` is set from the memory row each time a turn finishes, so the list never disagrees with the history.
- A spec creates, forks and deletes through every transport (terminal, web, API, gateway) and checks both tables agree.

### The limit

```yaml
# Agent.yaml
memory:
  type: jdbc            # the default; window, session, file and cache still work
  maxMessages: 500      # per conversation: the trigger
  onLimit: summarize    # summarize (default) or trim
  keepRecent: 100       # messages kept word for word after a summary
  summaryModel: ""      # a profile name; empty uses the agent's own model
```

- `maxMessages` is per conversation, a whole number from 20 to 100000. `0` is refused: an unbounded conversation is how a
  context window blows up.
- `onLimit: summarize` replaces the oldest messages with a summary once the limit is reached, so context is kept in short
  form. It is the default. `trim` drops the oldest messages instead (bx-ai's own trim) and costs no tokens. `keepRecent` must
  be smaller than `maxMessages`, as bx-ai's summary memory requires.
- The settings are bx-ai's own (`maxMessages`, summary threshold, summary model and provider), exposed under our names.
- `/compact` and the compact route summarise on request, whatever `onLimit` says. Today they do nothing when the agent has no
  summary model; with this change the agent's own model is the fallback, and the answer says which model was used.
- `/context` shows the count against the limit.
- Existing projects that set `memory` keep what they set. Only projects with no `memory` key move to the new default.

## 5. Volumes stay fixed

A volume is read from `Agent.yaml` when the server starts. The agent cannot add one, and there is no API route to add one:
a model that can widen its own file access has no sandbox. To change volumes, edit `Agent.yaml` and restart (or `/reload`
once the reload covers it). A later phase may let the agent ask for a volume, with the user approving it in a dialog.

## 6. Commands

| Command | What it does |
|---|---|
| `bxAgents data` | Prints the data home, its size per folder, the volumes with their mode, and the memory limit |
| `bxAgents backup [--to=FILE]` | Writes a zip of `chat.db` (a consistent copy, safe while the server runs), `files/` and `skills/` to `backups/` or to `FILE`. Volumes are not included |
| `bxAgents restore FILE [--home=DIR]` | Replaces `chat.db`, `files/` and `skills/` in the data home (or in `DIR`) from a backup. Refuses while a server is using that home, and keeps the old ones as `*.before-restore` |
| `/volumes` | In chat: lists the volumes |

## 7. API

Read-only routes, added to `ApiContract` so the OpenAPI document and the BoxLang client follow:

| Route | Returns |
|---|---|
| `GET /data` | `{ home, folders : [ { name, bytes, files } ] }`. Admin only |
| `GET /volumes` | `{ volumes : [ { name, mode, description } ] }`. Never the host path |
| `GET /skills` | `{ skills : [ { name, description, origin } ] }`, where `origin` is `project` or `agent` |

The compact route's answer gains `model` and `summarized`. Both appear under `capabilities` in `/agent`.

## 8. Tasks

1. `DataHome` class: resolve, create, README, writable check; specs.
2. `data` setting: loader, validator, generated app wiring, startup refusal for a built app; specs.
3. `Volumes` class: parse, validate, resolve, path check including symlinks; specs.
4. Tool module: derive `allowedPaths` and the read-only split from volumes; `volume:path` handling; instruction lines; specs.
5. Spike: does bx-ai pick up a skill saved while running, and can an agent take a combined skills list?
6. `SkillLibrary` class (project plus data home), `saveSkill` tool, `GET /skills`; specs.
7. Memory default: `jdbc` on `chat.db`, `maxMessages` and `onLimit` keys, validator, generator; specs.
8. `Conversations` as the one place that changes both tables; `messageCount` from the memory row; the cross-transport spec.
9. `/compact` falls back to the agent's model; `/context` shows the limit.
10. `data`, `backup`, `restore` verbs and `/volumes`; completions; specs.
11. `GET /data`, `GET /volumes` and `GET /skills` in `ApiContract`, handler, client; specs.
11b. Web page: a Data section in Settings (Server group) with the volumes (name, mode, description), the skills with their origin, the memory limit and, for admins, the data home size. Read-only.
12. Docs (English, mirror, Spanish), changelog, wizard questions for volumes and memory, full suite. One draft pull request per slice: data home and volumes, then skills, then memory.

## 9. The web app

The mockup is approved in shape. The rule is that **whatever can be done in the terminal chat can be done on the web page**, and **nothing on today's page is removed**: the header, the settings gear and its menu, the sidebar, the composer and every dialog stay. The left menu adds full pages next to them.

### Left menu

Chat, Agent, Registry, Memory and notes, Vault, Data and backups, Access tokens, Settings.

- It folds to icons with a button, and the choice is remembered in the browser.
- Each icon keeps its accessible name, with a tooltip on hover and keyboard focus. The current page is marked with `aria-current`, not only colour.
- Targets are at least 44 by 44 pixels, the focus ring is always visible, contrast is at least 4.5 to 1, a "Skip to content" link comes first, and animation is off for reduced motion.
- On a phone the menu is a drawer opened from a menu button. Focus moves into it, Esc or a tap outside closes it, focus returns to the button, and the page behind is inert. The header gear stays.

### Screens

| Screen | Shows |
|---|---|
| Agent, Composition | How the agent is put together: what comes in, the agent's parts, the team, what it reaches out to. Each part opens its screen |
| Agent, Files | The project tree and the data home tree, with a read-only view of `Agent.yaml` |
| Agent, Usage | A snapshot of the last 7 days (tokens per day, by model) when `usage: true`. When it is off, a note and a "Turn on usage" button (admins). A card says longer history comes with the cloud version |
| Registry | Tools, Skills and Volumes tabs, read only |
| Memory and notes | Both note scopes with their limits, and each conversation against the message limit |
| Vault | The secrets list with Add, Edit, Remove, Yours and The agent's tabs, the agent's request banner, and "Key and activity" |
| Vault, Key and activity | What `vault status` and `vault audit` print: key source, secret count, the key-file warning, and the activity table with refused rows |
| Data and backups | Folder sizes, the memory settings, Back up now, the backups list, Restore (staged for the next start) |
| Access tokens | Today's tokens dialog as a page |
| Settings | Appearance, model and ping, channels, extensions with Reload, server details, Password |

The run order view was cut: it needs per-turn data the server does not keep.

## 10. Terminal parity check

Every built-in chat command and where it lives on the web:

| Terminal | Web | State |
|---|---|---|
| `/new`, `/sessions`, `/resume`, `/name`, `/fork`, `/export`, `/clear`, `/compact` | Sidebar and the gear menu | Exists |
| `/notes`, `/remember` | Notes dialog and Memory and notes page | Exists |
| `/vault` | Vault dialog and the Vault page | Exists, page is new |
| `vault status`, `vault audit` | Vault, Key and activity | New |
| `/context` | Context ring and breakdown | Exists |
| `/model`, `/profile`, `/default` | Model picker in the header | Exists. Check it has a "default" choice |
| `/ping` | Settings, Ping the model | Exists as a command, button is new |
| `/tools` | Registry, Tools | New page |
| `/keys` | Help dialog | Exists |
| `/info`, `/help` | Agent page and the command menu | Exists |
| `/stats` | Agent, Usage | New |
| `/copy` | A Copy button under each answer | New |
| `/extensions`, reload | Settings, Extensions, Reload extensions | New |
| `/volumes`, `/skills` | Registry, and the command menu | New with this phase |
| Approval dialog | Approve and Reject in the tool chip | Exists |
| Image paste, attachments | Attach button, paste and drop | Exists |
| `@file` menu | Not on the web | **Open**: could list volume files as `@notes:todo.md` |
| `/exit`, `/prompt`, `/record` | None | Terminal only: they are about the screen itself |
| `!cmd`, `!!cmd`, `#bif()`, `##bif()` | None | **Terminal only on purpose**: they run a shell command or BoxLang code, and a browser should not be able to |

## 11. Added routes

Read-only unless noted. All go in `ApiContract`, so the OpenAPI document and the client follow.

| Route | Does |
|---|---|
| `GET /data` | Data home, folder sizes |
| `GET /volumes`, `GET /skills` | The registry lists. No host paths |
| `POST /backup`, `GET /backups`, `POST /restore` | Backups. A restore is staged and applied at the next start. Restore is admin only |
| `GET /usage`, `POST /usage/enable` | The 7 day snapshot, and the switch that writes `usage: true` (admin) |
| `GET /vault/status`, `GET /vault/audit` | Key state and activity (admin). The vault list, add, edit and remove routes already exist for the dialog |
| `POST /extensions/reload` | Reload extensions (admin) |

## 12. Web tasks

13. Left menu: component, collapse button, remembered choice, tooltips, skip link, phone drawer with focus handling; checked in a real browser and with a screen reader.
14. Pages: Agent (Composition, Files, Usage), Registry, Memory and notes, Vault with Key and activity, Data and backups, Access tokens, Settings.
15. The routes in section 11, with specs.
16. Copy button, Reload extensions, model picker "default" choice.
17. Docs (English, mirror, Spanish) and screenshots.

## Open questions

1. Should the web composer's `@` menu list volume files (`@notes:todo.md`), to match the terminal?
2. When a conversation is summarised on its own, one line in every transport, or nothing? (Planned: one line.)
