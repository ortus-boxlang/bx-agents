---
title: "El asistente de new"
icon: phosphor-duotone:magic-wand
summary: "Responde unas preguntas y bxAgents new construye el agente: tools, servidores MCP, canales, acceso y destino de despliegue."
description: "Responde unas preguntas y bxAgents new construye el agente: tools, servidores MCP, canales, acceso y destino de despliegue."
tags: [guides, cli, wizard]
---

# El asistente de new

Ejecuta `bxAgents new` en una terminal sin `--model` y te pregunta qué debe hacer el agente; después escribe el proyecto a la medida. Nada de esto es magia: cada respuesta termina en un archivo que puedes leer, y la última pantalla imprime el comando de una línea que construiría el mismo proyecto sin preguntas.

```bash
bxAgents new my-agent
```

Es una interfaz de pantalla completa en el verde azulado del logo de BxAgents. Las flechas (o `j`/`k`) se mueven, Espacio marca, Enter confirma, **Esc vuelve una pregunta atrás** y **Ctrl+C cancela** sin crear nada. Las respuestas ya dadas se colapsan en una línea cada una sobre la pregunta actual.

## Qué pregunta

| Etapa | Qué eliges | Qué escribe |
|---|---|---|
| Nombre, propósito | El nombre del agente y una descripción de una línea | `name`, `description` en [`Agent.yaml`](../conventions/agent-yaml.md) |
| Forma | Un agente, un equipo, un agente programado, un servidor MCP | La [plantilla](../agent-templates.md) correspondiente |
| Modelo | Un proveedor y, opcionalmente, un nombre de modelo (Enter toma el predeterminado del proveedor) | `model`, y un marcador para `<PROVEEDOR>_API_KEY` en `.env` |
| Tools | Fecha y hora, traer páginas, buscar en la web, navegar sitios, archivos, imágenes y voz | Una lista [`tools:`](../conventions/agent-yaml.md#tools); navegar también añade `bx-playwright` a tu `box.json` |
| Buscador | El integrado, Brave, Tavily, Exa o Google | Un marcador de clave en `.env` y una línea en `instructions.md` que indica al agente qué proveedor usar |
| Tools de archivos | Solo lectura, las 19, o una por una; luego las carpetas que pueden usar | [`toolOptions.bxai.allowedPaths`](../conventions/agent-yaml.md#tools-de-archivos) |
| Memoria | En memoria o guardada en disco | `memory` y `checkpointer` |
| Servidores MCP | GitHub, Stripe, Notion, Atlassian, Cloudflare, Supabase, Git | Entradas [`mcpServers`](../conventions/mcp.md#consumir-servidores-remotos) y marcadores de token |
| Canales | Chat web, API HTTP, Telegram, Slack, Discord, WhatsApp, Teams, SMS, GitHub, Email, Signal | Un archivo `gateways/*.bx` y los marcadores que necesita |
| Acceso web | Abierto, una clave compartida o usuarios con contraseña | `apiKeyEnvVar` o `users` en la entrada del chat web |
| Protección | Marcar, bloquear o ignorar entradas sospechosas | Un bloque [`security`](../conventions/agent-yaml.md#ajustes) |
| Despliegue | Docker, DigitalOcean, SSH, SFTP, FTP, una carpeta local, o más tarde | `deploy/<destino>.json` |

Una etapa cuya respuesta ya diste como opción se omite y se muestra como respondida. Una etapa que no aplica (el buscador cuando la búsqueda está desactivada) se omite sin avisar.

## Las tools de archivos nunca reciben todo el disco

bx-ai incluye 19 tools de archivos pero no registra ninguna. El asistente las ofrece y siempre pregunta **qué carpetas** pueden usar: la carpeta temporal (`tmp`), la carpeta desde la que ejecutas el agente (`cwd`) o una ruta que escribas. No continúa sin ninguna. No hay forma de pedir acceso sin restricciones desde el asistente ni desde las opciones; una lista vacía se rechaza porque bx-ai la interpreta como "en todas partes".

```yaml
tools:
  - readFile@bxai
  - listDirectory@bxai
toolOptions:
  bxai:
    allowedPaths:
      - tmp
      - cwd
```

## Secretos

El asistente nunca te pide escribir un secreto que luego guarde.

- **Claves de API y tokens** van en `.env` como marcadores vacíos, cada uno bajo un comentario que dice dónde obtenerlo. Los archivos que los usan contienen solo el **nombre** de la variable.
- Una **clave de acceso web** se genera por ti (un valor aleatorio de 64 caracteres) y se escribe en `.env`, porque protege algo que estás por ejecutar.
- Una **contraseña del chat web** se convierte en hash con el mismo PBKDF2 que `bxAgents hash-password`; solo el hash llega a `gateways/webui.bx` y es seguro versionarlo.

`.env` está en el `.gitignore` con el que se crea el proyecto.

## Servidores MCP

Todos los servidores del selector son remotos (HTTP) y el bx-ai incluido puede conectarse a ellos; se listan con su nivel de riesgo. Cada uno lee su credencial del entorno cuando arranca la app:

```yaml
mcpServers:
  - name: github
    url: "https://api.githubcopilot.com/mcp/"
    token: "${env.GITHUB_PERSONAL_ACCESS_TOKEN}"
```

| Servidor | Credencial | Riesgo |
|---|---|---|
| GitHub | `GITHUB_PERSONAL_ACCESS_TOKEN` | Alto: puede abrir y fusionar pull requests, subir archivos, lanzar Actions |
| Stripe | `STRIPE_AGENT_API_KEY` | Alto: mueve dinero. Usa primero una cuenta sandbox |
| Notion | `NOTION_MCP_TOKEN` | Medio: edita y borra páginas. Los tokens requieren plan Business o Enterprise |
| Atlassian | `ATLASSIAN_API_TOKEN` | Medio. Sin verificar: no está documentado el encabezado donde va un token de API |
| Cloudflare | `CLOUDFLARE_API_TOKEN` | Alto: DNS, Workers, recursos facturables, según el token |
| Supabase | `SUPABASE_ACCESS_TOKEN` | Alto: ejecuta SQL. La dirección empieza en solo lectura |

Elegir un servidor de riesgo alto muestra lo que puede hacer antes de continuar. **Git** se ejecuta como programa en tu máquina (`uvx mcp-server-git`), así que necesita [uv](https://docs.astral.sh/uv/) instalado donde corre el agente, y trabaja en la carpeta desde la que arrancas el agente. El asistente lo escribe como una entrada `command`; consulta [programas como servidores MCP](../conventions/mcp.md#servidores-que-se-ejecutan-como-programa).

## Después de crearlo

`new` ejecuta `box install` (omítelo con `--skipInstall`) y luego imprime lo que falta: las claves por completar, cómo chatear, probar, servir y desplegar, y, por cada canal elegido, la configuración que ocurre fuera del proyecto. Para WhatsApp son la app de Meta, el token de verificación y una dirección pública; para Slack, Socket Mode y dos tokens; para Signal, un `signal-cli` en ejecución. Los mismos pasos están en cada [página de gateway](../conventions/gateways/index.md).

## Sin el asistente

El asistente no escribe nada que una opción no pueda. La última pantalla imprime el comando; este salió de una ejecución real:

```bash
bxAgents new support-bot --name=support-bot --model=claude --with=time,fetch,search --search=brave \
  --mcp=github --channels=web,telegram --web-auth=key --guard=flag --deploy=docker --registry=ghcr:me/support-bot
```

| Opción | Acepta |
|---|---|
| `--with` | `time`, `fetch`, `search`, `browse`, `files`, `media` (una lista) |
| `--search` | `http`, `brave`, `tavily`, `exa`, `google` |
| `--files`, `--files-dir` | `read`, `all` o una lista de nombres de tools; carpetas como `tmp`, `cwd` o rutas absolutas. Se necesitan ambas a la vez |
| `--memory` | `cache` o `file` |
| `--mcp` | ids de servidores MCP (una lista) |
| `--channels` | `web`, `api`, o ids de canales (una lista) |
| `--web-auth` | `open` o `key`. Los usuarios necesitan contraseñas, así que salen del asistente o de `gateways/webui.bx` |
| `--guard` | `off`, `flag` o `block` |
| `--deploy` | `docker`, `digitalocean`, `ssh`, `sftp`, `ftp`, `local`, con `--registry=ghcr:owner/name` (o `dockerhub:`, `docr:`), `--app`, `--region`, `--host`, `--user`, `--remote-path`, `--destination` según el destino |

Una opción con un valor incorrecto detiene el comando y dice qué acepta. El asistente se activa así:

| Ejecutas | Resultado |
|---|---|
| `bxAgents new` en una terminal | El asistente de pantalla completa |
| `bxAgents new` en un pipe, o con `--no-tui` | Las mismas preguntas como líneas numeradas. Escribe `back` para volver |
| `bxAgents new --model=...` | Sin preguntas: un modelo significa que lo llama un script. Añade `--wizard` para que pregunte el resto |
| `bxAgents new --no-wizard` o `--yes` | Sin preguntas, solo opciones y valores predeterminados |

Define `NO_COLOR` para una salida sin color. Las opciones de Agent.yaml que escribe el asistente necesitan el `Agent.yaml` predeterminado, así que no se pueden combinar con `--class`.
