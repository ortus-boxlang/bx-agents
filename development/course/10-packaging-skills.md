---
title: "Lesson 10: Packaging Skills"
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

```
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

## How it's wired at runtime

`skills/` is copied verbatim into the generated app, the same wipe-then-write,
dotfile-excluding copy as `tools/`. The generated `config/ColdBox.bx` always points
bx-ai's own `skillsDirectory` module setting at `/skills` - you never need to set this
yourself, even though bx-ai's own default is a different path (`/.agents/skills`).

## Tools vs. skills - when to reach for which

Use a **tool** when the agent needs to call a specific function with specific
arguments and get a specific return value back (get the weather, look up an order).
Use a **skill** when you want to hand the agent a body of know-how it applies
judgment to (how to write a professional email, how your team formats commit
messages, how to review a pull request against your team's checklist).

## Try it

```
skills/
└── code-review/
    └── SKILL.md
```

```markdown
---
name: code-review
description: How to review a code change for this project.
---

When asked to review code, check for: unhandled errors, missing tests for new
behavior, and inconsistent naming with the surrounding file. Be specific - point to
the exact line and explain the risk, don't just say "looks fine" or "consider
improving this."
```

Rebuild and try asking your agent to review a snippet of code.

Full reference: [skills/](../conventions/skills.md).

Next: [Lesson 11 - Composing Subagents](11-composing-subagents.md)
