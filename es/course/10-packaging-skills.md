---
title: "Lección 10: Empaquetar skills"
icon: phosphor-duotone:graduation-cap
summary: Claude Agent Skills - una subcarpeta por SKILL.md, cargadas bajo demanda.
description: Claude Agent Skills - una subcarpeta por SKILL.md, cargadas bajo demanda.
tags: [course, conventions, skills]
---

# Empaquetar skills

Mientras que `tools/` da a tu agente una única función invocable, `skills/` le da una
capacidad empaquetada y de formato libre - instrucciones que el agente carga bajo demanda, en
lugar de una función que llama directamente.

Cada subcarpeta inmediata de `skills/` que contenga un archivo `SKILL.md` es una skill,
siguiendo la convención [Claude Agent Skills](https://www.anthropic.com/engineering/claude-skills):
frontmatter YAML (`name`, `description`) seguido de un cuerpo de instrucciones libres.

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

## Nombres

El nombre de la skill es el `name:` de su frontmatter si está presente; si no, recae en el
nombre de la carpeta. Un `name:` explícito siempre gana, aunque difiera del de la carpeta. Dos
skills que resuelvan al mismo nombre fallan la validación con un error de nombre duplicado.

Una carpeta sin un `SKILL.md` dentro no se descubre como skill en absoluto - simplemente se
ignora, lo cual resulta práctico para subcarpetas de trabajo o para recursos guardados junto a
una skill con otra estructura.

## Cómo se cablea en tiempo de ejecución

`skills/` se copia literalmente a la aplicación generada, con la misma copia de
borrar-y-escribir y exclusión de archivos ocultos que `tools/`. El `config/ColdBox.bx`
generado siempre apunta el ajuste de módulo `skillsDirectory` de bx-ai a `/skills` - nunca
necesitas configurarlo tú, aunque el valor por defecto de bx-ai sea otra ruta
(`/.agents/skills`).

## Tools frente a skills - cuándo usar cada una

Usa una **tool** cuando el agente necesite llamar a una función concreta con argumentos
concretos y obtener un valor de retorno concreto (consultar el tiempo, buscar un pedido).
Usa una **skill** cuando quieras entregarle al agente un cuerpo de conocimiento sobre el que
aplica criterio (cómo escribir un correo profesional, cómo formatea tu equipo los mensajes de
commit, cómo revisar un pull request contra la checklist de tu equipo).

## Pruébalo

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

Reconstruye y prueba a pedirle a tu agente que revise un fragmento de código.

Referencia completa: [skills/](../conventions/skills.md).

Siguiente: [Lección 11 - Componer subagentes](11-composing-subagents.md)
