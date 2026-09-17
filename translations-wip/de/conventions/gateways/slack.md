---
title: "gateways/ - Slack"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, slack]
---

# Slack

Teil der Push-Style-[gateways/](index.md)-Familie - dort werden die gemeinsame Regel "Secrets bleiben extern", `GatewaySession`, und der Scheduler erklärt, unter dem diese Gateways laufen. Diese Seite behandelt Slacks eigene Config-Form und (wo BxAgents etwas Plattform-Spezifisches tut) wie sie mit Slack kommuniziert.

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

`type: "slack"` erfordert sowohl `botTokenEnvVar` als auch `appTokenEnvVar`. Wird auf dieselbe Weise geprüft wie der `secretEnvVar` eines Channel-Adapter-`http`-Eintrags.

Generierte Registrierungsanweisung:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.SlackGateway", { "appToken" : getSystemSetting( "SLACK_APP_TOKEN", "" ), "botToken" : getSystemSetting( "SLACK_BOT_TOKEN", "" ) } ) )
```

## Slacks persistente Verbindung

`SlackGateway` hält seinen Websocket über den asynchronen WebSocket-Client von `java.net.http.HttpClient`, überbrückt von einer BoxLang-Listener-Klasse, die direkt `implements="java:java.net.http.WebSocket$Listener"` (`models/gateways/support/SlackSocketListener.bx`) - BoxLang kompiliert das als echten JVM-Implementierer der Schnittstelle, empirisch bestätigt, indem eine Instanz direkt an `HttpClient.newWebSocketBuilder().buildAsync( uri, listener )` übergeben wurde, ohne Casting-Fehler (nur der erwartete `java.net.ConnectException`, sobald die echte Netzwerkgrenze erreicht war). Nur die Methoden, die die Klasse tatsächlich deklariert, überschreiben die `default`-Methoden der JDK-Schnittstelle; alles nicht Implementierte fällt automatisch auf das eigene Standardverhalten des JDK zurück. Das ist das Referenzmuster, dem jedes andere Gateway mit persistenter Verbindung (Discord, unten) ebenfalls folgt.

Reconnects werden reaktiv von Slacks eigenen Protokollsignalen getrieben - ein `disconnect`-Frame (`warning`/`refresh_requested`) oder ein unerwarteter Socket-Close - wobei eine **neue** Verbindung geöffnet wird, bevor die alte geschlossen wird, gemäß Slacks eigener dokumentierter Empfehlung. Ein leichtgewichtiger Scheduler-Watchdog (`slack-watchdog-<name>`, alle 30s) ist nur ein Sicherheitsnetz für den Fall, dass keines dieser beiden Signale feuert.
