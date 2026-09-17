---
title: "Ejemplo: construir un agente de chat web"
icon: phosphor-duotone:chat-circle-dots
summary: Genera una página de chat completa y con marca propia para un agente - sin código de front end, sin Node, sin paso de build.
description: Genera una página de chat completa y con marca propia para un agente - sin código de front end, sin Node, sin paso de build.
tags: [guides, examples, web-ui]
---

# Ejemplo: construir un agente de chat web

[`examples/webui-agent/`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples/webui-agent) genera una página de chat completa y tematizada para un agente a partir de una sola entrada `gateways/*` con `exposes: "webui"` - la [UI web de chat v1](../conventions/web-ui.md). Sin código de front end que escribir, sin Node/npm en el build, sin un paso de despliegue aparte para una SPA - la página es un archivo real que BxAgents escribe dentro de la aplicación generada.

Este es el único ejemplo de esta serie de guías con capturas de pantalla reales, porque es el único tipo de ejemplo de BxAgents cuya salida es efectivamente una página de navegador - las imágenes de abajo son la salida real del generador para este mismo proyecto, renderizada y capturada directamente (no son un mockup), así que lo que ves es lo que produce realmente `bxAgents build && serve`.

## El proyecto

```
webui-agent/
├── Agent.bx
├── instructions.md
└── gateways/
    └── chat.bx
```

`Agent.bx` tiene la misma forma que en todos los demás ejemplos:

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "webui-agent",
			description : "An agent reachable through the v1 web chat UI via gateways/.",
			model       : aiModel( provider: "mock", params: { model: "mock-model" } )
		)
		return this
	}

}
```

## El gateway: marca y tema, todo en configuración

`gateways/chat.bx` es de donde sale realmente la página - `exposes: "webui"` es el disparador, y todo lo demás es personalización opcional:

```javascript
class {

	function configure() {
		return {
			exposes     : "webui",
			path        : "/chat",
			apiKeyEnvVar: "CHAT_UI_API_KEY",   // optional - omit entirely to leave the UI's /chat/api/* route open (dev-mode)

			// ---------------------------------------------------------------
			// Branding
			// ---------------------------------------------------------------
			title      : "Acme Support",
			subtitle   : "Orders, returns and shipping",
			icon       : "🛟",                 // an emoji, or an image URL/path ("/logo.svg", "https://...")
			welcome    : "Hi! Ask me about an order, a return, or shipping times.",
			placeholder: "Ask about your order...",
			footer     : "Answers are generated and may be wrong - check anything important.",

			// ---------------------------------------------------------------
			// Stream detail - both default to true
			// ---------------------------------------------------------------
			showReasoning: true,   // the model's thinking, as a collapsed "Thinking" strip
			showToolCalls: true,   // each tool call as a collapsed chip (name + arguments)

			// ---------------------------------------------------------------
			// Theme - every key maps to a CSS custom property on the page.
			// ---------------------------------------------------------------
			theme: {
				accent  : "0f766e",
				accentFg: "ffffff",
				radius  : "10px",
				font    : "Inter, system-ui, sans-serif",
				maxWidth: "68%",

				dark: {
					accent  : "2dd4bf",
					accentFg: "05201c"
				}
			}
		};
	}

}
```

Los colores se escriben como hexadecimal pelado, sin `#` inicial (`"0f766e"`, no `"#0f766e"`) - BoxLang inicia la interpolación de cadenas al encontrar una almohadilla tanto en cadenas con comillas simples como dobles, así que una literal tendría que duplicarse para que siquiera se parsee. El hexadecimal pelado evita todo eso; consulta el comentario del propio archivo para el razonamiento completo, y [La UI web de chat](../conventions/web-ui.md) para todo lo que los tokens de tema no cubran (eso va en `resources/webui/theme.css`, que se incrusta el último y gana).

## Construir y ejecutar

```bash
cd examples/webui-agent
bxAgents build
bxAgents serve --port=8080
```

Abre **http://localhost:8080/chat/index.html**. Esta es la página generada real para la configuración `chat.bx` de este proyecto que aparece arriba - barra lateral de conversaciones a la izquierda, transcript con streaming en el centro, encabezado y compositor tematizados:

![La UI web de chat generada: una barra lateral de conversaciones, un transcript de varios turnos, y un encabezado/compositor con marca](../assets/webui-chat-light.png)

### Modo oscuro

Las sobrescrituras de `theme.dark` (`accent`/`accentFg`) se aplican automáticamente cuando el propio interruptor de tema de la página cambia a oscuro - todo lo demás es el mismo CSS generado, solo que con otros tokens:

![La misma página y conversación con el interruptor Theme cambiado a oscuro - los tokens accent/accentFg de theme.dark se trasladan, el resto es el mismo CSS generado](../assets/webui-chat-dark.png)

### Pantallas estrechas

La página es responsive sin ningún build móvil aparte - en un viewport estrecho, el transcript conserva todo su ancho y la barra lateral de conversaciones pasa a superponerse en lugar de comprimir el contenido:

![La misma página en un viewport estrecho - el transcript conserva todo el ancho, la barra lateral se superpone en lugar de exprimirlo](../assets/webui-chat-mobile.png)

## La protección opcional por clave de API

Este ejemplo viene con `apiKeyEnvVar` **definido**, así que `/chat/api/*` exige una cabecera `X-API-Key` que coincida - el propio armazón estático (`/chat/index.html`) sigue siendo accesible en cualquier caso, ya que la navegación normal de una página en el navegador no puede enviar una cabecera personalizada, y ese armazón es precisamente lo que te pide la clave:

```bash
export CHAT_UI_API_KEY="a-real-secret"
bxAgents build
bxAgents serve --port=8080
```

La página carga bien en ambos casos, pero enviar un mensaje sin haber configurado antes la clave correspondiente con el botón **Key** de la página devuelve un 401 - pulsa **Key**, pega `a-real-secret`, y funcionará durante el resto de la sesión del navegador (se guarda en `localStorage`). Elimina por completo la línea `apiKeyEnvVar` para dejar la UI abierta (aceptable en desarrollo local, nunca en un despliegue público).

## ¿Por qué no simplemente `toAi()`?

`path: "/chat"` controla tanto dónde se sirve el armazón estático como dónde vive su propia API dedicada (`/chat/api`, respaldada por un `handlers/ChatUi.bx` generado) - reutiliza exactamente la forma de rutas y el formato de datos de `toAi()` para `invoke`/`stream`/`batch`, pero deriva la identidad del visitante **solo en el servidor**, en lugar de fiarse de un `userId` proporcionado por quien llama, como hace `toAi()`. Esa distinción importa precisamente porque una página de navegador vive tras una única clave de API compartida y sin login por usuario - consulta [¿Por qué no `toAi()` para la webui?](../conventions/web-ui.md) para el razonamiento completo.

## Qué está probado, y qué no

La salida del generador en sí - el armazón estático, los marcadores de plantilla, el interceptor de autenticación opcional, su registro en `config/ColdBox.bx` - está demostrada con specs reales del generador, y se ha confirmado que compila e instancia. Sobre HTTP real, `runColdBoxIntegrationTests.bxs` demuestra `/chat/api/health` y, además, el viaje de ida y vuelta de preferencias compartidas (`/chat/api/preferences/set` + `/chat/api/preferences`) entre dos llamantes independientes - consulta [Limitaciones conocidas](../known-limitations.md) para saber exactamente qué está cubierto de esa forma y qué no (el historial de conversaciones y el streaming SSE no lo están, a día de hoy). Las capturas de arriba se tomaron de la plantilla generada real y de la configuración real de este proyecto, no de un mockup hecho a mano - pero haz al menos una comprobación real con `bxAgents serve` y un navegador de tus propias decisiones de tema y marca antes de depender de ellas en producción, el mismo consejo permanente que la página de limitaciones da para cada ruta generada.

## Dónde ir a continuación

- [La UI web de chat](../conventions/web-ui.md) para el cuadro completo - aprobaciones con humano en el bucle, compactación, redirigir mientras se transmite, y el almacén de conversaciones respaldado por SQLite.
- [Ejemplo: un agente mínimo](example-minimal-agent.md) si aún no has visto la forma base de un proyecto.
- [Ejemplo: construir un bot de Slack](example-slack-bot.md) para un agente accesible desde una plataforma de chat en lugar de un navegador.
