---
title: skills/
icon: phosphor-duotone:graduation-cap
summary: "Claude Agent Skills: ein Unterordner pro SKILL.md, bei Bedarf geladen."
description: "Claude Agent Skills: ein Unterordner pro SKILL.md, bei Bedarf geladen."
tags: [conventions, skills]
---

# skills/

Jeder unmittelbare Unterordner von `skills/`, der eine `SKILL.md`-Datei enthält, ist ein Skill, gemäß der Claude-Agent-Skills-Konvention: YAML-Frontmatter (`name`, `description`), gefolgt von einem Körper aus freien Instruktionen.

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

## Namensgebung

Der Name des Skills ist sein Frontmatter-`name:`, falls vorhanden; ansonsten fällt er auf den Ordnernamen zurück (`greeting/` ohne Frontmatter-Name würde ohnehin als `greeting` entdeckt, aber ein explizites `name:` gewinnt immer, selbst wenn es vom Ordner abweicht). Zwei Skills, die auf denselben Namen auflösen, schlagen bei der Validierung mit einem Fehler wegen doppeltem Namen fehl.

Ein Ordner ohne `SKILL.md` darin wird überhaupt nicht als Skill entdeckt - er wird einfach ignoriert (nützlich für Scratch-Unterordner, neben einem Skill in einer anderen Struktur mitgeführte Assets usw., solange sie nicht direkt unter `skills/` selbst ohne eine `SKILL.md` liegen).

## Wie es zur Laufzeit verdrahtet wird

`skills/` wird unverändert in die generierte App kopiert (dieselbe Wipe-dann-Schreib-, Dotfile-ausschließende Kopie wie bei [`tools/`](tools.md)). Die generierte `config/ColdBox.bx` richtet bx-ais eigene Moduleinstellung `skillsDirectory` immer auf `/skills`:

```javascript
moduleSettings = {
	bxai : { skillsDirectory : "/skills" }
}
```

!!! info
    bx-ais eigenes Standard-`skillsDirectory` ist `/.agents/skills` - ein anderer Pfad als BxAgents' `skills/`-Konvention. Der Generator überschreibt ihn immer explizit, damit der eigene `skills/`-Ordner des Projekts derjenige ist, aus dem bx-ai tatsächlich lädt; das muss nie selbst gesetzt werden.
