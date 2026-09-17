---
title: "gateways/ - Slack"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, slack]
---

# Slack

Parte de la familia de gateways de estilo push [gateways/](index.md) - allí se explica la regla compartida de que "los secretos permanecen externos", `GatewaySession`, y el scheduler bajo el que se ejecutan estos gateways. Esta página cubre la forma de configuración propia de Slack y (cuando BxAgents hace algo específico de la plataforma) cómo se comunica con Slack.

```javascript
// gateways/slackChannel.bx
class {
	function configure() {
		return {
			type          : "slack",
			botTokenEnvVar: "SLACK_BOT_TOKEN",   // xoxb-... - chat.postMessage/chat.update
			appTokenEnvVar: "SLACK_APP_TOKEN"    // xapp-... - apps.connections.open (Socket Mode)
		};
	}
}
```

`type: "slack"` requiere tanto `botTokenEnvVar` como `appTokenEnvVar`. Comprobado de la misma manera que el `secretEnvVar` de una entrada channel-adapter `http`.

Sentencia de registro generada:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.SlackGateway", { "appToken" : getSystemSetting( "SLACK_APP_TOKEN", "" ), "botToken" : getSystemSetting( "SLACK_BOT_TOKEN", "" ) } ) )
```

## La conexión persistente de Slack

`SlackGateway` mantiene su websocket vía el cliente WebSocket asíncrono de `java.net.http.HttpClient`, mediado por una clase listener de BoxLang que `implements="java:java.net.http.WebSocket$Listener"` directamente (`models/gateways/support/SlackSocketListener.bx`) - BoxLang lo compila como un implementador de JVM real, confirmado empíricamente entregando una instancia directamente a `HttpClient.newWebSocketBuilder().buildAsync( uri, listener )` sin ningún error de casting (solo el esperado `java.net.ConnectException` una vez que se alcanzó la frontera de red real). Solo los métodos que la clase realmente declara sobreescriben los métodos `default` de la interfaz del JDK; cualquier cosa no implementada cae automáticamente al comportamiento por defecto propio del JDK. Este es el patrón de referencia que sigue también cada otro gateway de conexión persistente (Discord, abajo).

Las reconexiones son impulsadas de forma reactiva por las propias señales del protocolo de Slack - un frame `disconnect` (`warning`/`refresh_requested`) o un cierre de socket inesperado - abriendo una conexión **nueva** antes de cerrar la vieja, según la recomendación documentada de Slack. Un watchdog ligero de scheduler (`slack-watchdog-<name>`, cada 30s) es solo una red de seguridad para el caso en que ninguna de esas señales se dispare.
