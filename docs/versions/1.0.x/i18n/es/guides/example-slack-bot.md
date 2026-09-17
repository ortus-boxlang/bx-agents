---
title: "Ejemplo: construir un bot de Slack"
icon: phosphor-duotone:slack-logo
summary: Haz accesible un agente como una app real de Slack por Socket Mode - sin necesidad de un webhook público.
description: Haz accesible un agente como una app real de Slack por Socket Mode - sin necesidad de un webhook público.
tags: [guides, examples, gateways, slack]
---

# Ejemplo: construir un bot de Slack

[`examples/slack-gateway-agent/`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples/slack-gateway-agent) conecta un agente a una app real de Slack mediante una entrada de `gateways/` de tipo push con `type: "slack"`. Slack usa **Socket Mode** - un websocket persistente que el propio gateway mantiene abierto - así que, a diferencia de una plataforma dirigida por webhooks (WhatsApp Cloud, Teams, Twilio, GitHub), no hay ninguna ruta pública que exponer ni a la que hacer `curl`; es el gateway quien contacta con Slack, y no al revés. Consulta [Gateways de tipo push](../conventions/gateways/index.md) para ver en qué se diferencia esta categoría de la exposición HTTP con `exposes: "agent"`/`"webui"`.

## El proyecto

```
slack-gateway-agent/
├── Agent.bx
├── instructions.md
└── gateways/
    └── slackChannel.bx
```

`Agent.bx` tiene la misma forma que en todos los demás ejemplos:

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "slack-gateway-agent",
			description : "An agent reachable as a real Slack app via gateways/, over Socket Mode.",
			model       : aiModel( provider: "mock", params: { model: "mock-model" } )
		)
		return this
	}

}
```

## El gateway

`gateways/slackChannel.bx` declara el tipo de plataforma y de dónde vienen sus credenciales - **nombres de variables de entorno**, no los secretos en sí, de modo que nada sensible acaba nunca en la aplicación generada ni en el control de versiones:

```javascript
class {

	function configure() {
		return {
			type          : "slack",
			botTokenEnvVar: "SLACK_BOT_TOKEN",   // xoxb-... - chat.postMessage/chat.update scope
			appTokenEnvVar: "SLACK_APP_TOKEN"    // xapp-... - apps.connections.open scope (Socket Mode)
		};
	}

}
```

En tiempo de build, `GatewayGenerator` convierte esto en una instancia registrada de `SlackGateway` y la cablea en la única `GatewaySession` del proyecto, que es de ámbito global (consulta [`GatewaySession` es de ámbito de proyecto y solo del agente raíz](../known-limitations.md) para el límite actual de v1 en ese punto). En tiempo de ejecución, `SlackGateway.onConnect()` abre el websocket de Socket Mode en cuanto arranca `GatewaySession`.

## Instrucciones

```markdown
## Slack Gateway Agent

You are a helpful workspace assistant, reachable as a Slack app. Use
Slack-flavored formatting sparingly (bold with `*asterisks*`, not markdown `**`).
```

Nada de aquí es específico de la API de Slack más allá de una nota de formato - la lógica del propio agente no sabe, ni le importa, qué gateway está entregando sus respuestas.

## 1. Crea una app de Slack

En [api.slack.com/apps](https://api.slack.com/apps), crea una app "from scratch":

1. **Socket Mode** - actívalo y genera un token de nivel de app con el scope `connections:write` (`xapp-...`) → este será `SLACK_APP_TOKEN`.
2. **OAuth & Permissions** - añade el scope de bot `chat:write`, instala la app en tu workspace y copia el Bot User OAuth Token (`xoxb-...`) → este será `SLACK_BOT_TOKEN`.
3. **Event Subscriptions** - actívalo y suscríbete al evento de bot `message.im` (y/o `message.channels`), para que la app reciba realmente los eventos de mensaje por el socket.

## 2. Configura y ejecuta

```bash
export SLACK_BOT_TOKEN="xoxb-..."
export SLACK_APP_TOKEN="xapp-..."
cd examples/slack-gateway-agent
bxAgents build
bxAgents serve
```

Envía un DM al bot, o menciónalo en un canal donde esté. Las respuestas vuelven en streaming token a token mediante un mensaje provisional que `SlackGateway` publica de inmediato y después actualiza en el sitio con `chat.update` a medida que llegan los tokens - el mismo efecto de revelado incremental que te da la [UI web de chat](../conventions/web-ui.md) en un navegador, producido aquí enteramente a través de la propia API de edición de mensajes de Slack.

!!! info
    Este caso no tiene ningún punto de entrada al que hacer `curl` - escribe de verdad a la app en Slack para verlo funcionar. Esto es cierto para todos los gateways de conexión persistente (el long-poll de Telegram, los websockets de Slack/Discord); solo las plataformas dirigidas por webhooks (WhatsApp Cloud, Teams, Twilio, GitHub) generan una ruta a la que puedes llamar localmente con una firma calculada a mano - el README de cada uno de esos ejemplos muestra cómo.

## Qué está probado, y qué no

`SlackGatewaySpec.bx` ejercita la lógica de entrada y salida del gateway - troceado, aprobaciones con humano en el bucle, manejo de reconexión - enteramente contra una costura de pruebas inyectable, nunca contra una conexión real a Slack; un smoke test aparte confirma que la propia interoperabilidad WebSocket entre BoxLang y Java funciona correctamente (un intento de conexión real a una dirección inalcanzable falla con un `ConnectException` normal, no con un error de interoperabilidad). Ninguna prueba de este repositorio ha completado un handshake real de Socket Mode contra los servidores de verdad de Slack - consulta [Limitaciones conocidas](../known-limitations.md) para el estado actual y honesto de esa carencia en todos los gateways de tipo push. Los pasos de arriba son exactamente la verificación manual que esa carencia exige.

## Dónde ir a continuación

- [Slack](../conventions/gateways/slack.md) para la convención completa del gateway - modelo de reconexión, correlación con humano en el bucle, límites de troceado.
- [Ejemplo: un equipo multiagente](example-multi-agent-team.md) para combinar un agente accesible por gateway con delegación en subagentes.
- [Limitaciones conocidas](../known-limitations.md) para saber qué demuestran y qué no las pruebas automatizadas de cada gateway de tipo push.
