---
title: skills/
icon: phosphor-duotone:books
summary: "Claude Agent Skills: one subfolder per SKILL.md, loaded on demand."
description: "Claude Agent Skills: one subfolder per SKILL.md, loaded on demand."
tags: [conventions, skills]
---

# skills/

Each immediate subfolder of `skills/` that contains a `SKILL.md` file is one skill, following the Claude Agent Skills convention: YAML frontmatter (`name`, `description`) followed by a body of freeform instructions.

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

The skill's name is its frontmatter `name:` if present; otherwise it falls back to the folder name (`greeting/` with no frontmatter name would be discovered as `greeting` anyway, but an explicit `name:` always wins even if it differs from the folder). Two skills resolving to the same name fail validation with a duplicate-name error.

A folder without a `SKILL.md` inside it is not discovered as a skill at all - it's simply ignored (useful for scratch subfolders, assets kept alongside a skill under a different structure, etc., as long as they don't sit directly under `skills/` themselves without a `SKILL.md`).

## How it's wired at runtime

`skills/` is copied verbatim into the generated app (same wipe-then-write, dotfile-excluding copy as [`tools/`](tools.md)). The generated `config/ColdBox.bx` always points bx-ai's own `skillsDirectory` module setting at `/skills`:

```javascript
moduleSettings = {
	bxai : { skillsDirectory : "/skills" }
}
```

!!! info
    bx-ai's own default `skillsDirectory` is `/.agents/skills` - a different path than BX Agents' `skills/` convention. The generator always overrides it explicitly so your project's `skills/` folder is the one bx-ai actually loads from; you never need to set this yourself.