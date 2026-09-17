---
title: "gateways/ - Signal"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, signal]
---

# Signal

Parte de la familia de gateways de estilo push [gateways/](index.md) - allí se explica la regla compartida de que "los secretos permanecen externos", `GatewaySession`, y el scheduler bajo el que se ejecutan estos gateways. Esta página cubre la forma de configuración propia de Signal y (cuando BxAgents hace algo específico de la plataforma) cómo se comunica con Signal.

```javascript
// gateways/signalChannel.bx
class {
	function configure() {
		return {
			type         : "signal",
			accountEnvVar: "MY_SIGNAL_ACCOUNT"   // el número de teléfono registrado en signal-cli con el que este gateway envía/recibe, E.164
			// httpUrl: "http://127.0.0.1:8080"   // override opcional - por defecto "http://127.0.0.1:8080", donde se espera que escuche el propio daemon HTTP API de signal-cli
		};
	}
}
```

`type: "signal"` requiere `accountEnvVar` - todo comprobado de la misma manera que se comprueba el `secretEnvVar` de `http`.. Comprobado de la misma manera que el `secretEnvVar` de una entrada channel-adapter `http`.

Sentencia de registro generada:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.SignalGateway", { "account" : getSystemSetting( "MY_SIGNAL_ACCOUNT", "" ) } ) )
```

## Signal - una cuarta forma de transporte, contra un daemon externo `signal-cli`

`SignalGateway` no está impulsado por webhook como WhatsApp Cloud/Teams/Twilio/GitHub arriba, y tampoco es un websocket como Slack/Discord - extiende `ScheduledGatewayBase` de la misma manera que lo hacen Telegram/Slack/Discord/Email, pero su propia conexión es **Server-Sent Events**: un único request de larga duración `GET {httpUrl}/api/v1/events?account=...` mantenido abierto vía la API asíncrona de `java.net.http.HttpClient` (`sendAsync()` + `BodyHandlers.ofLines()`), leyendo un evento JSON por línea a medida que el propio daemon de signal-cli los empuja por el mismo cuerpo de respuesta. Los envíos salientes son JSON-RPC 2.0 simple (`POST {httpUrl}/api/v1/rpc`, `{"jsonrpc":"2.0","method":"send","params":{...},"id":...}`) contra el mismo daemon.

No hay ninguna API oficial de bot de Signal - `SignalGateway` habla enteramente con [`signal-cli`](https://github.com/AsamK/signal-cli) ejecutándose en su propio modo `daemon --http`, un **prerequisito externo** del que depende este gateway pero que no gestiona, la misma relación que `EmailGateway` tiene con un servidor externo IMAP/SMTP. Portado desde el propio canal real de Signal de [Hermes Agent](https://github.com/NousResearch/hermes-agent) - las formas de cable SSE/JSON-RPC, las constantes de retroceso de reconexión (2s a 60s exponencial, +20% de jitter), y el watchdog de inactividad de 30s/120s se leen todos directamente de ese código fuente, no reimplementados desde cero.

!!! warning
    Conseguir un daemon `signal-cli` funcional es un paso de configuración manual, real y de una sola vez, completamente fuera de este proyecto: instala `signal-cli`, regístralo/vincúlalo a una cuenta real de Signal (`signal-cli link` o `register`, ambos requieren un número de teléfono real y un paso de verificación/QR de vinculación de dispositivo), luego ejecuta `signal-cli -a <account> daemon --http=127.0.0.1:8080` y mantén ese proceso vivo (un servicio systemd o sidecar de contenedor, no algo que `bxAgents serve` inicie por ti). El propio `onConnect()` de `SignalGateway` falla ruidosamente con `MissingConfig` si `account` no está configurado, pero no puede detectar ni iniciar el daemon él mismo - `httpUrl` inalcanzable en el momento de la conexión sale a la superficie como un ciclo ordinario de retroceso de reconexión, no un fallo rápido.

!!! info
    v1 es **solo DM** - el propio canal de Signal de Hermes trata las conversaciones grupales como opt-in/desactivadas por defecto, y ese es el único modo portado aquí. El human-in-the-loop está degradado de la misma manera que el respaldo de Twilio/GitHub (`getDeclaredCapabilities()` omite `"interactiveActions"`) - los recibos de lectura/reacciones de Signal son solo estado cosmético de solo-escritura en la propia API de signal-cli, no un canal de respuesta real, así que `requestHumanInteraction()` recae en un mensaje de texto plano listando las decisiones permitidas, correlacionado por conversationID como el propio respaldo indexado-por-número-de-teléfono de Twilio. La lógica de análisis JSON-RPC/SSE (`handleSseEvent()`, enhebrado de cita, filtrado de mensaje de grupo, coincidencia de decisión HITL) se condujo a través de métodos públicos reales con solo las llamadas de E/S `rpcCaller`/`connector` más externas siendo stubbeadas, la misma disciplina de prueba de seam que cada otro gateway - pero no había ningún daemon real de `signal-cli` disponible en este entorno, así que el ciclo de vida real de conexión asíncrona (abrir el stream SSE, el bucle de retroceso-con-reconexión contra una conexión genuinamente inestable, el round-trip JSON-RPC contra un daemon en vivo) nunca se ha ejercitado de extremo a extremo. La propia cadena de interoperabilidad de `java.net.http.HttpClient` se confirmó sólida - una prueba de humo independiente alcanzó un `java.net.ConnectException` genuino en la frontera de red real contra una dirección de prueba inalcanzable, probando que la plomería funciona aunque nunca haya tocado un daemon en vivo.
