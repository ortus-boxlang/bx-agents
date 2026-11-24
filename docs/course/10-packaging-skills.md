---
title: "Packaging Skills"
icon: phosphor-duotone:graduation-cap
summary: Claude Agent Skills - one subfolder per SKILL.md, loaded on demand.
description: Claude Agent Skills - one subfolder per SKILL.md, loaded on demand.
tags: [course, conventions, skills]
---

# Packaging Skills

Where `tools/` gives your agent a single callable function, `skills/` gives it a
packaged, freeform capability - instructions the agent loads on demand rather than a
function it calls directly.

Each immediate subfolder of `skills/` that contains a `SKILL.md` file is one skill,
following the [Claude Agent Skills](https://www.anthropic.com/engineering/claude-skills)
convention: YAML frontmatter (`name`, `description`) followed by a body of freeform
instructions.

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

## Naming

The skill's name is its frontmatter `name:` if present; otherwise it falls back to the
folder name. An explicit `name:` always wins even if it differs from the folder. Two
skills resolving to the same name fail validation with a duplicate-name error.

A folder without a `SKILL.md` inside it isn't discovered as a skill at all - it's
simply ignored, which is handy for scratch subfolders or assets kept alongside a skill
under a different structure.

## Starting one, and installing one

`bxAgents add skill code-review` writes `skills/code-review/SKILL.md` with the frontmatter and
a body to fill in. Skills other people published are installed from skills.boxlang.io:

```bash
bxAgents skills find review
bxAgents skills install <owner/repo/skill>
bxAgents skills list
```

Installed skills go into `.agents/skills/` (kept out of source control) and are recorded in
`.agents/skills.lock.json`, which you commit; `build` restores whatever the lock lists and the
disk lacks. Skills in `skills/` and installed ones both go into the build, and one of your own
with the same name wins. `skills update` and `skills remove` do what they say.

## How it's wired at runtime

`skills/` is copied verbatim into the generated app, the same wipe-then-write,
dotfile-excluding copy as `tools/`. The generated `config/bxai-settings.json` always points
bx-ai's own `skillsDirectory` module setting at `/app/skills` - you never need to set this
yourself, even though bx-ai's own default is a different path (`/.agents/skills`).

## Tools vs. skills - when to reach for which

Use a **tool** when the agent needs to call a specific function with specific
arguments and get a specific return value back (get the weather, look up an order).
Use a **skill** when you want to hand the agent a body of know-how it applies
judgment to (how to write a professional email, how your team formats commit
messages, how to review a pull request against your team's checklist).

## Try it

Acme has a refund policy. A tool would be a function; this is know-how, so it is a skill. Write the folder with its
`SKILL.md` (or let `bxAgents add skill refund-policy` write the frame):

```markdown title="acme-support/skills/refund-policy/SKILL.md"
---
name: refund-policy
description: What Acme refunds, when, and how to explain a refusal kindly.
---

# Refund policy

- Returns are free for 30 days after delivery.
- Refunds land within 5 working days of the parcel coming back.
- Sale items are final, but a damaged item is always replaced.
```

Rebuild. The agent lists the skills it can load in its system prompt, so asking the scripted model for it (the word
`system` again) shows yours next to the six BxAgents ships:

```bash title="Terminal 2"
cd ~/bxagents-course/acme-support
bxAgents build
bxAgents invoke --message=system
```

```text title="You see"
Build succeeded: <anything>/acme-support/.build/app
...
- refund-policy: What Acme refunds, when, and how to explain a refusal kindly.
...
```

The six that ship (`bxagents-build-agent`, `bxagents-chat`, `bxagents-gateways-connectors`, `bxagents-operate`,
`bxagents-subagents-routines` and `bxagents-tools-and-skills`) are on by default and teach the agent how BxAgents
itself works; `skills: { builtin: false }` leaves them out. In the terminal chat, `/skills` lists all of them and
where each came from (`project` for yours, `bxagents` for the shipped ones). A model loads a skill on its own when
the question matches its description, which the scripted model does not do: it only answers with what the course
wrote. The agent can also write a skill itself (`skill_save`, with your approval), which the
[approvals lesson](approvals.md) comes back to.

## Checkpoint

`acme-support/skills/refund-policy/SKILL.md` exists. `kit/resume.sh 10-packaging-skills` restores it; rebuild after.

Next: [Models and Profiles](12-named-model-configs.md)
