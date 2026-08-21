---
title: skills/
icon: phosphor-duotone:graduation-cap
summary: "Claude Agent Skills: una subcarpeta por SKILL.md, cargada bajo demanda."
description: "Claude Agent Skills: una subcarpeta por SKILL.md, cargada bajo demanda."
tags: [conventions, skills]
---

# skills/

Cada subcarpeta inmediata de `skills/` que contiene un archivo `SKILL.md` es una skill, siguiendo la convención de Claude Agent Skills: frontmatter YAML (`name`, `description`) seguido de un cuerpo de instrucciones de formato libre.

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

## Nombramiento

El nombre de la skill es su `name:` de frontmatter si está presente; de lo contrario recae en el nombre de la carpeta (`greeting/` sin nombre de frontmatter de todos modos se descubriría como `greeting`, pero un `name:` explícito siempre gana incluso si difiere de la carpeta). Dos skills que resuelven al mismo nombre fallan la validación con un error de nombre duplicado.

Una carpeta sin un `SKILL.md` dentro no se descubre como una skill en absoluto - simplemente se ignora (útil para subcarpetas de borrador, activos guardados junto a una skill bajo una estructura diferente, etc., siempre que no se sitúen directamente bajo `skills/` sin un `SKILL.md` propio).

## Cómo se conecta en tiempo de ejecución

`skills/` se copia textualmente a la app generada (la misma copia de borrar-y-escribir, excluyendo dotfiles, que [`tools/`](tools.md)). El `config/ColdBox.bx` generado siempre apunta el propio ajuste de módulo `skillsDirectory` de bx-ai a `/skills`:

```javascript
moduleSettings = {
	bxai : { skillsDirectory : "/skills" }
}
```

!!! info
    El propio `skillsDirectory` por defecto de bx-ai es `/.agents/skills` - una ruta diferente a la convención `skills/` de BX Agents. El generador siempre lo sobreescribe explícitamente para que la carpeta `skills/` de tu proyecto sea la que bx-ai realmente carga; nunca necesitas configurar esto tú mismo.
