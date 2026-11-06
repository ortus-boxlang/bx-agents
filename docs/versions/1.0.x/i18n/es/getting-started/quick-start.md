---
title: Inicio rápido
icon: phosphor-duotone:rocket-launch
summary: "El ciclo de vida completo de un proyecto: generar andamiaje, editar, construir, ejecutar."
description: "El ciclo de vida completo de un proyecto: generar andamiaje, editar, construir, ejecutar."
tags: [getting-started]
---

# Inicio rápido

Esto recorre el ciclo de vida completo de un proyecto BxAgents: generar el andamiaje, editar, construir, ejecutar.

## 1. Genera el andamiaje de un proyecto

```bash
bxAgents new my-agent
```

En una terminal esto pregunta qué debe hacer el agente (su modelo, tools, servidores MCP, canales, cómo llega la gente a él, dónde se despliega) y escribe el proyecto a la medida; ver [el asistente de new](../guides/new-wizard.md). Termina imprimiendo el comando de una línea que construye el mismo proyecto sin preguntas. Para omitir las preguntas, pasa un modelo:

```bash
bxAgents new my-agent --model=openai/gpt-5
```

`--model` es un slug `provider/model` - ver [el slug de modelo](../conventions/agent-bx.md#the-model-slug) para cómo se analiza. `--name` y `--description` son opcionales; `--name` por defecto toma el propio nombre del directorio destino.

Esto crea:

```
my-agent/
├── Agent.yaml
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

Más un `.env` (con `BOXLANG_HOME=.build/runtime`; los secretos viven aquí, así que pon ahí las claves de API de tu proveedor y mantenlo fuera del control de código) y un `.gitignore`. BoxLang carga por sí mismo el `.env` desde la raíz del proyecto.

Este es el starter `minimal` - el predeterminado cuando se omite `--template`. Una plantilla es un preajuste: el asistente (y flags como `--with`, `--channels` y `--deploy`) añaden tools, canales y un destino de despliegue encima. `new` también puede generar uno de otros 7 starters incorporados (`--template=webui-chat|slack-bot|telegram-bot|github-bot|mcp-server|scheduled|multi-agent`), cada uno añadiendo un poco de contenido preconfigurado (un gateway, un scheduler) sobre el mismo esqueleto, o saltarse el andamiaje por completo y crear el proyecto a partir de un repositorio de GitHub existente (`--repo=owner/repo`) o un paquete de ForgeBox (`--forgebox=<slug>`) en su lugar - ver la [Referencia de la CLI](../cli-reference.md#new) para la lista completa y cómo funciona cada uno. El agente se define por defecto con un `Agent.yaml`; pasa `--class` para generar en su lugar el `Agent.bx` avanzado basado en clase (ver [Agent.bx](../conventions/agent-bx.md)).

`Agent.yaml` se ve así (`--description` añade una línea `description:`):

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

El agente es solo este archivo más `instructions.md`. Ver [Agent.yaml](../conventions/agent-yaml.md) para todas las claves.

Cada carpeta de convención se crea vacía - añade archivos a las que tu agente realmente necesite y elimina (o simplemente ignora) el resto.

## 2. Edita

Abre `instructions.md` y escribe el system prompt del agente, y ajusta `name`, `description` o `model` en `Agent.yaml` a tu gusto. Añade una tool:

```javascript
// tools/Greeter.bx
class {

	@AITool( "Say hello to someone by name." )
	function sayHello( name ) {
		return "Hello, " & arguments.name & "!";
	}

}
```

Ver la sección de [Convenciones](../conventions/agent-yaml.md) para cada otra carpeta (`skills/`, `subagents/`, `gateways/`, `schedules/`, `mcp/`, `interceptors/`, `modules/`). No tienes que escribirlas a mano: `bxAgents add <kind>` (`tool`, `skill`, `subagent`, `gateway`, `schedule`, `interceptor`, `mcp`, `profile`, `provider`, `capability`, `extension`) hace unas cuantas preguntas y escribe los archivos, y `--dry-run` los muestra antes.

## 3. Pruébalo

```bash
box install        # una vez, para obtener testbox en lib/testbox (`new` ya lo intentó por ti)
bxAgents test
```

El `tests/specs/AgentSpec.bx` generado pasa de inmediato - construye tu agente contra el proveedor `mock` (sin necesidad de clave de API ni red) y afirma sobre una respuesta guionizada. Ver [tests/](../conventions/testing.md) para `mockResponses()` y los matchers personalizados (`toHaveCalledTool`, etc.) disponibles para tus propios specs.

## 4. Construye

```bash
bxAgents build
```

Ejecuta el [pipeline de build](../build-pipeline.md) completo - resolución de configuración, descubrimiento, validación, generación de código, normalización de manifest - y escribe una aplicación ColdBox real en `.build/app/`, más `.build/manifest.json`. Ejecuta `bxAgents build --environment=production` para construir contra un override de entorno de `Agent.yaml` (ver [Agent.yaml](../conventions/agent-yaml.md#entornos)).

Si tu proyecto falla la validación (nombres de tool duplicados, un proveedor de modelo desconocido, una entrada de gateway con una ruta incorrecta, ...) `build` falla con todos los errores recopilados - no solo el primero.

## 5. Ejecútalo

Dos formas de hablar con el agente construido - ambas cargan exactamente el mismo `GeneratedAgentFactory.bx` y construyen exactamente el mismo árbol de agentes, así que nunca divergen:

**De forma interactiva, desde la terminal:**

```bash
bxAgents chat
```

En una terminal es un chat a pantalla completa que conserva tu scrollback: las respuestas llegan en streaming como Markdown con formato, las llamadas a tools se muestran mientras se ejecutan, Esc detiene al agente, y escribir `/` lista los comandos (`/sessions`, `/resume`, `/name`, `/fork`, `/export`, `/notes`, `/context` y más). Escribe `@` para adjuntar un archivo, o `@picture.png` para enviar una imagen. Las conversaciones se listan en `data/chat.db` (los mensajes duran lo mismo que la memoria del agente), así que `bxAgents chat --continue` puede retomar donde lo dejaste. Ver [la interfaz de terminal](../guides/terminal-ui.md) y [Comandos de barra](../guides/slash-commands.md). Para chatear contra la aplicación completa (schedulers, interceptores, gateways), usa `bxAgents chat --server`, o `--connect=<url>` para un servidor que ya está en marcha (añade `--token=<token>` si lo pide).

**Sobre HTTP**, vía un proceso real de [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver):

```bash
bxAgents serve --port=8080
```

Todo agente servido tiene una API HTTP en `/__bxagents` (abierta en tu propia máquina, tras tokens cuando la compartes), y la página web, el chat de terminal y las plataformas de chat la usan. Ver [Llama a tu agente desde código](../guides/agent-api.md).

Si tu proyecto además tiene una entrada `gateways/*` con `{ exposes: "agent", path: "/api/chat" }`, el agente es alcanzable en `POST http://localhost:8080/api/chat/invoke` (y `/stream`, `/batch`, `/info` - ver [gateways/](../conventions/gateways/index.md)). Una entrada `exposes: "webui"` añade la página de chat del navegador.

## 6. Inspecciona, empaqueta, despliega

```bash
bxAgents doctor               # runtime, módulos, comprobaciones del proyecto y variables de entorno sin definir
bxAgents inspect              # cómo está compuesto el agente: agentes, herramientas, variables, comprobaciones
bxAgents package --version=1.0.0   # escribe dist/my-agent-1.0.0.bxa + .sha256
bxAgents deploy --destination=/path/to/somewhere   # copia el .bxa más nuevo allí
```

Ver [El manifest](../manifest.md) y [Despliegue y secretos](../deployment-and-secrets.md).

## 7. Limpia

```bash
bxAgents clean
```

Elimina solo `.build/` y `dist/` - las convenciones fuente de tu proyecto (`Agent.yaml`, `tools/`, etc.) nunca se tocan.

## Próximos pasos

- Recorre cada carpeta de convención en [Convenciones](../conventions/agent-yaml.md).
- Mira los proyectos de muestra funcionales en [`examples/`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples).
- Ver los flags de cada verbo en [Referencia de CLI](../cli-reference.md).
