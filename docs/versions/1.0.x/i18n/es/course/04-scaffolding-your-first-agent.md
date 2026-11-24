---
title: "Crear el andamiaje de tu primer agente"
icon: phosphor-duotone:sparkle
summary: Ejecuta bxAgents new y mira exactamente qué te crea.
description: Ejecuta bxAgents new y mira exactamente qué te crea.
tags: [course, getting-started]
---

# Crear el andamiaje de tu primer agente

Con BoxLang y BxAgents instalados ([Instalar BxAgents](03-installing-bxagents.md)),
crea el andamiaje de tu primer proyecto:

```bash
bxAgents new my-agent --model=openai/gpt-5
```

`--model` es un slug `provider/model` (verás exactamente cómo se
interpreta en [La definición del agente - Agent.yml](05-agent-bx.md)). Pásalo para una ejecución apta para scripts: sin
`--model`, en una terminal, `new` te hace preguntas (consulta el [asistente de `new`](../guides/new-wizard.md)).
`--name` y `--description` son opcionales;
`--name` toma por defecto el nombre del propio directorio de destino. `new` se niega a
ejecutarse si el destino ya contiene un `Agent.yml` o un `Agent.bx`.

## El asistente

En una terminal, `bxAgents new my-agent` (sin `--model`) abre un asistente a pantalla completa.
Pregunta qué debe hacer el agente: su modelo, tools, memoria, servidores MCP, canales (chat web,
Slack, Telegram y otros), cómo inicia sesión la gente y dónde se despliega. Esc vuelve una
pregunta atrás y Ctrl+C no crea nada. Una pregunta elige una plantilla, la forma de la que parte
el proyecto, y tus otras respuestas se añaden encima: una plantilla es un preajuste, no un límite.
La última pantalla imprime el comando de una línea que construye el mismo proyecto sin preguntas,
para que un script pueda repetirlo. Pasa `--model` (o `--no-wizard`) para omitir las preguntas.
Consulta el [asistente de `new`](../guides/new-wizard.md) para ver cada pregunta y cada flag.

## Qué se crea

```text
my-agent/
├── Agent.yml
├── instructions.md
├── tools/
├── skills/
├── subagents/
├── gateways/
├── schedules/
├── mcp/
├── interceptors/
├── modules/
└── tests/
    ├── box.json
    └── specs/
        └── AgentSpec.bx
```

Más un `.env` (solo con comentarios para tus claves de API; a propósito no define
`BOXLANG_HOME`), un `.gitignore` (ignora `.build/`, `dist/`, `.env`, `lib/` y `data/chat.db*`, entre otros; la base de datos del chat vive ahora en la carpeta de datos del agente, `~/.bxagents/<nombre del agente>/`, fuera del proyecto, así que esa última línea solo importa en un proyecto que ya guarda una en `data/`)
y unos cuantos dotfiles (`.boxlang.json`, `.editorconfig`, `.bxlint.json`, `.gitattributes`,
`.markdownlint.json`) - `new` nunca sobrescribe ninguno si ya existen. BoxLang carga por sí mismo el `.env`
desde la raíz del proyecto, así que es donde viven los secretos: el asistente y `add` escriben una
línea vacía por cada clave que tus elecciones necesitan (una clave de proveedor, un token de bot),
y los archivos que la usan solo guardan el nombre de la variable.

Todas las carpetas de convención se crean **vacías**. Añades archivos a las que tu agente
realmente necesita y dejas el resto en paz - una carpeta `tools/` vacía no tiene ningún
efecto sobre la aplicación generada.

## `Agent.yml` tiene este aspecto

(Si pasas `--description`, `new` añade una línea `description:`.)

```yaml
# Your agent. Most agents need nothing more than this file and instructions.md.
# For code in the definition (hooks, dynamic instructions), scaffold with --class.
name: my-agent
model: openai/gpt-5

environments:
  # `bxAgents test` builds against this override by default (see
  # BaseAgentSpec.bx) so a fresh project's tests need no API key or
  # network access - swap the model to test against a real provider.
  test:
    model: mock/mock-model
```

Esa es toda la definición del agente - más sobre cada clave en la
[La definición del agente - Agent.yml](05-agent-bx.md). Si necesitas código en la definición, pasa `--class` y `new`
crea en su lugar un `Agent.bx` basado en clase (también se explica al final de
[La definición del agente](05-agent-bx.md)).

## La suite de pruebas se prepara sola

`new` también ejecuta `box install` en la raíz del proyecto creado (su `box.json` lista TestBox), de modo que
`bxAgents test` ([Probar tu agente](19-testing-your-agent.md)) funciona de inmediato sin ningún
paso aparte. Esto es de mejor esfuerzo - si `box` no está en el `PATH` o la instalación
falla, `new` sigue teniendo éxito y simplemente te dice que lo ejecutes tú. Pasa
`--skipInstall` para desactivarlo por completo.

## Pruébalo

```bash
bxAgents new my-agent --model=openai/gpt-5
cd my-agent
ls
```

Ya tienes un proyecto BxAgents real, aunque mínimo. Más adelante puedes ampliarlo sin editar
archivos a mano: `bxAgents add tool`, `add skill`, `add subagent`, `add gateway`, `add schedule` y
los demás tipos de `add` hacen unas cuantas preguntas y escriben los archivos por ti (`--dry-run`
los muestra antes). Las cuatro lecciones siguientes recorren lo que hace falta de verdad para ejecutarlo.

Siguiente: [La definición del agente: Agent.yml](05-agent-bx.md)
