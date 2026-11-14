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

!!! tip
    `bxAgents add skill <name>` crea `skills/<name>/SKILL.md` con el frontmatter y un cuerpo para rellenar. Consulta [`add`](../cli-reference.md#add-skill).

![La página Registry en la pestaña Skills, con una skill abierta en el lector](../assets/webui/webui-registry-skills.png)

La [página Registry](web-ui.md#registry) de la web app lista cada skill con su nivel y abre su `SKILL.md` en un lector. `/skills NOMBRE` y `bxAgents skills show NOMBRE` hacen lo mismo en la terminal.

## Nombramiento

El nombre de la skill es su `name:` de frontmatter si está presente; de lo contrario recae en el nombre de la carpeta (`greeting/` sin nombre de frontmatter de todos modos se descubriría como `greeting`, pero un `name:` explícito siempre gana incluso si difiere de la carpeta). Dos skills que resuelven al mismo nombre fallan la validación con un error de nombre duplicado.

Una carpeta sin un `SKILL.md` dentro no se descubre como una skill en absoluto - simplemente se ignora (útil para subcarpetas de borrador, activos guardados junto a una skill bajo una estructura diferente, etc., siempre que no se sitúen directamente bajo `skills/` sin un `SKILL.md` propio).

## Skills del registro

Las skills de skills.boxlang.io se instalan con `bxAgents skills install <owner/repo/skill>`, no se copian a mano. Van en `.agents/skills/` (la carpeta por defecto de bx-ai), fuera del control de código; `.agents/skills.lock.json` se versiona y `build` restaura desde él. Ambas carpetas van al build, y una skill de `skills/` con el mismo nombre gana. Consulta [`skills`](../cli-reference.md#skills).

## Cómo se conecta en tiempo de ejecución

`skills/` se copia textualmente a la app generada (la misma copia de borrar-y-escribir, excluyendo dotfiles, que [`tools/`](tools.md); una carpeta de skill que es un enlace simbólico se sigue y se copia). El `skills/` de la app reúne las skills del proyecto y las instaladas.

bx-ai lee su carpeta de skills una sola vez, al arrancar el runtime, antes de que se apliquen los ajustes de la app. Por eso la fábrica de agentes generada añade ella misma el `skills/` de la app a la lista de skills globales de bx-ai, antes de construir ningún agente, y después las skills de las extensiones y las que el agente guardó en su carpeta de datos. Todos los agentes reciben esa única lista, así que `GET /skills`, la página Registro y `/skills` muestran las mismas skills y el agente puede cargarlas. Funciona igual con `serve`, `chat` y una app empaquetada.

!!! info
    El `skillsDirectory` por defecto de bx-ai es `/.agents/skills`, una ruta diferente a la convención `skills/` de BxAgents. Nunca necesitas configurarlo. Las skills instaladas en el `.agents/skills/` de tu proyecto se copian al `skills/` de la app al construir.
