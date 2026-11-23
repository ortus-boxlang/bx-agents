---
title: skills/
icon: phosphor-duotone:graduation-cap
summary: "Claude Agent Skills: one subfolder per SKILL.md, loaded on demand."
description: "Claude Agent Skills: one subfolder per SKILL.md, loaded on demand."
tags: [conventions, skills]
---

# skills/

Each immediate subfolder of `skills/` that contains a `SKILL.md` file is one skill, following the Claude Agent Skills convention: YAML frontmatter (`name`, `description`) followed by a body of freeform instructions.

```text
skills/
└── greeting/
    └── SKILL.md
```

```markdown
---
name: greeting
description: How to greet people warmly.
---

Always greet the user warmly and use their name if known.
```

!!! tip
    `bxAgents add skill <name>` creates `skills/<name>/SKILL.md` with the frontmatter and a body to fill in. See [`add`](../cli-reference.md#add-skill).

![The Registry page on the Skills tab, with a skill open in the reader](../assets/webui/webui-registry-skills.png)

The [Registry page](web-ui.md#registry) of the web app lists every skill with its level and opens its `SKILL.md` in a reader. `/skills NAME` and `bxAgents skills show NAME` do the same in the terminal.

## Naming

The skill's name is its frontmatter `name:` if present; otherwise it falls back to the folder name (`greeting/` with no frontmatter name would be discovered as `greeting` anyway, but an explicit `name:` always wins even if it differs from the folder). Two skills resolving to the same name fail validation with a duplicate-name error.

A folder without a `SKILL.md` inside it is not discovered as a skill at all - it's simply ignored (useful for scratch subfolders, assets kept alongside a skill under a different structure, etc., as long as they don't sit directly under `skills/` themselves without a `SKILL.md`).

## The three levels

An agent's skill list is made from three levels, and a fourth that bxAgents brings itself. The first two are built into the app; the third is written by the agent while it runs.

```mermaid
flowchart TB
    GL["Global skills folder<br/>managed by a skills tool (npx, CommandBox)"]

    subgraph project["Your project"]
        direction TB
        INS[".agents/skills/<br/><b>1. Installed</b><br/>links to the global folder, or installed copies"]
        SHIP["skills/<br/><b>2. Ships with the agent</b><br/>written by you"]
    end

    subgraph app["The built app: skills/"]
        direction TB
        A1["copies of the installed skills<br/>listed in .installed.json"]
        A2["copies of your skills"]
    end

    subgraph home["The data home: skills/"]
        DH["<b>3. The agent's own</b><br/>written by the agent with skill_save"]
    end

    LIST(["The agent's skill list<br/>loaded by name when a task needs one"])

    GL -. "symbolic link" .-> INS
    INS -->|build| A1
    SHIP -->|build| A2
    A1 --> LIST
    A2 --> LIST
    DH -->|"at start, and the moment it is saved"| LIST
```

| Level | Where | Written by | `origin` in `/skills` |
|---|---|---|---|
| 1. Installed | `.agents/skills/` in the project. A skills tool links a skill from its global folder into it, or `bxAgents skills install` copies one there. It stays out of source control and is restored at build time | A skills tool or the registry | `installed` |
| 2. Ships with the agent | `skills/` in the project, and the skills [extensions](extensions.md) carry | You | `project` |
| 3. The agent's own | `skills/` in the [data home](data.md#skills-the-agent-saves) | The agent, with its `skill_save` tool | `agent` |
| bxAgents' own | `skills/` inside the bxAgents module: how to build, operate and chat with an agent | bxAgents | `bxagents` |

The rules between the levels:

- **Yours wins over installed.** A skill in `skills/` and an installed one with the same name or folder: the one in `skills/` is used.
- **The agent never replaces the first two.** `skill_save` refuses the name of an installed skill or one that ships with the agent. It can save over a skill it wrote itself, to improve it.
- **bxAgents' own come last.** A skill of yours with the same name as one of the six that bxAgents ships wins, and `skill_save` cannot take their names. They are available on request like every skill: only a name and a description are in the context until the model asks for one. `skills.builtin: false` in `Agent.yml` leaves them out.
- **A link is followed.** The app gets a copy of what the link points at, so a deployed app does not depend on the global folder.
- **The app tells levels 1 and 2 apart** by `skills/.installed.json`, which the build writes beside the skills. `/skills` and `GET /skills` use it to show each skill's level.

Level 3 is described in [data and volumes](data.md#skills-the-agent-saves): approval of each save, the limits, and the `skills` setting in `Agent.yml`.

## Skills from the registry

Skills from skills.boxlang.io are installed with `bxAgents skills install <owner/repo/skill>`, not copied by hand. They go in `.agents/skills/` (bx-ai's own default folder), out of source control; `.agents/skills.lock.json` is committed and `build` restores from it. Both folders go into the build, and a skill in `skills/` with the same name wins. A global skills tool can link its skills into `.agents/skills/` instead; a link is followed and the app gets a copy. See [`skills`](../cli-reference.md#skills).

## How it's wired at runtime

`skills/` is copied verbatim into the generated app (same wipe-then-write, dotfile-excluding copy as [`tools/`](tools.md); a skill folder that is a symbolic link is followed and copied). The app's `skills/` folder holds the project's own skills and the installed ones together.

bx-ai reads its skills folder once, when the runtime starts, which is before an app's settings are applied. So the generated agent factory adds the app's `skills/` folder to bx-ai's list of global skills itself, before any agent is built, and then the extensions' skills and the skills the agent saved in its data home. Every agent is given that one list, so the same skills are listed by `GET /skills`, the Registry page and `/skills`, and loaded by the agent's skill tool. It works the same for `serve`, for `chat` and for a packaged app, since all of them build agents from the same factory.

The generated app also writes `{ "skillsDirectory": "/skills" }` to `config/bxai-settings.json` (not `config/ColdBox.bx`, because ColdBox's `moduleSettings` does not reach bx-ai, a BoxLang module).

!!! info
    bx-ai's own default `skillsDirectory` is `/.agents/skills`, a different path than BxAgents' `skills/` convention. You never need to set it. Skills installed under your project's `.agents/skills/` are copied into the app's `skills/` at build time.
