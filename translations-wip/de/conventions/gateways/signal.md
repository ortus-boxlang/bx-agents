---
title: "gateways/ - Signal"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, signal]
---

# Signal

Teil der Push-Style-[gateways/](index.md)-Familie - dort werden die gemeinsame Regel "Secrets bleiben extern", `GatewaySession`, und der Scheduler erklärt, unter dem diese Gateways laufen. Diese Seite behandelt Signals eigene Config-Form und (wo BxAgents etwas Plattform-Spezifisches tut) wie sie mit Signal kommuniziert.

```javascript
// gateways/signalChannel.bx
class {
	function configure() {
		return {
			type         : "signal",
			accountEnvVar: "MY_SIGNAL_ACCOUNT"   // the signal-cli-registered phone number this gateway sends/receives as, E.164
			// httpUrl: "http://127.0.0.1:8080"   // optional override - defaults to "http://127.0.0.1:8080", where signal-cli's own daemon HTTP API is expected to be listening
		};
	}
}
```

`type: "signal"` erfordert `accountEnvVar` - alle auf dieselbe Weise geprüft wie `http`s `secretEnvVar`.. Wird auf dieselbe Weise geprüft wie der `secretEnvVar` eines Channel-Adapter-`http`-Eintrags.

Generierte Registrierungsanweisung:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.SignalGateway", { "account" : getSystemSetting( "MY_SIGNAL_ACCOUNT", "" ) } ) )
```

## Signal - eine vierte Transportform, gegen einen externen `signal-cli`-Daemon

`SignalGateway` ist nicht Webhook-getrieben wie WhatsApp Cloud/Teams/Twilio/GitHub oben, und es ist auch kein Websocket wie Slack/Discord - es erweitert `ScheduledGatewayBase` auf dieselbe Weise wie Telegram/Slack/Discord/E-Mail, aber seine eigene Verbindung sind **Server-Sent Events**: ein einzelner, langlebiger `GET {httpUrl}/api/v1/events?account=...`-Request, offen gehalten über die asynchrone API von `java.net.http.HttpClient` (`sendAsync()` + `BodyHandlers.ofLines()`), wobei ein JSON-Event pro Zeile gelesen wird, während signal-clis eigener Daemon sie über denselben Response-Body pusht. Ausgehende Sends sind einfaches JSON-RPC 2.0 (`POST {httpUrl}/api/v1/rpc`, `{"jsonrpc":"2.0","method":"send","params":{...},"id":...}`) gegen denselben Daemon.

Es gibt keine offizielle Signal-Bot-API - `SignalGateway` spricht ausschließlich mit [`signal-cli`](https://github.com/AsamK/signal-cli), das im eigenen `daemon --http`-Modus läuft, eine **externe Voraussetzung**, von der dieses Gateway abhängt, die es aber nicht selbst verwaltet, dieselbe Beziehung, die `EmailGateway` zu einem externen IMAP-/SMTP-Server hat. Portiert aus [Hermes Agents](https://github.com/NousResearch/hermes-agent) eigenem echtem Signal-Kanal - die SSE-/JSON-RPC-Drahtformen, die Reconnect-Backoff-Konstanten (2s bis 60s exponentiell, +20% Jitter) und der 30s/120s-Idle-Watchdog werden alle direkt aus jener Quelle gelesen, nicht von Grund auf neu implementiert.

!!! warning
    Einen funktionierenden `signal-cli`-Daemon zu bekommen ist ein echter, manueller, einmaliger Einrichtungsschritt vollständig außerhalb dieses Projekts: `signal-cli` installieren, mit einem echten Signal-Konto registrieren/verknüpfen (`signal-cli link` oder `register`, beide brauchen eine echte Telefonnummer und einen Geräteverknüpfungs-QR-/Verifikationsschritt), dann `signal-cli -a <account> daemon --http=127.0.0.1:8080` ausführen und diesen Prozess am Laufen halten (ein systemd-Dienst oder Container-Sidecar, nicht etwas, das `bxAgents serve` selbst startet). `SignalGateway`s eigenes `onConnect()` scheitert laut mit `MissingConfig`, falls `account` nicht gesetzt ist, kann aber den Daemon selbst weder erkennen noch starten - ein zur Verbindungszeit unerreichbares `httpUrl` äußert sich als gewöhnlicher Reconnect-Backoff-Zyklus, nicht als schneller Fehlschlag.

!!! info
    v1 ist **nur DM** - Hermes' eigener Signal-Kanal behandelt Gruppenkonversationen standardmäßig als opt-in/aus, und das ist der einzige hier portierte Modus. Human-in-the-Loop ist auf dieselbe Weise verschlechtert wie Twilio/GitHubs Fallback (`getDeclaredCapabilities()` lässt `"interactiveActions"` weg) - Signal-Lesebestätigungen/Reaktionen sind in signal-clis eigener API nur schreibbarer kosmetischer Status, kein echter Antwortkanal, `requestHumanInteraction()` fällt also auf eine reine Textnachricht zurück, die die erlaubten Entscheidungen auflistet, korreliert nach conversationID wie Twilios eigener telefonnummer-geschlüsselter Fallback. Die JSON-RPC-/SSE-Parsing-Logik (`handleSseEvent()`, Zitat-Threading, Gruppen-Nachrichten-Filterung, HITL-Entscheidungsabgleich) wurde durch echte öffentliche Methoden gesteuert, wobei nur die äußersten `rpcCaller`-/`connector`-I/O-Aufrufe gestubbt sind, dieselbe Naht-Test-Disziplin wie bei jedem anderen Gateway - aber in dieser Umgebung war kein echter `signal-cli`-Daemon verfügbar, sodass der tatsächliche asynchrone Verbindungslebenszyklus (Öffnen des SSE-Streams, die Reconnect-mit-Backoff-Schleife gegen eine tatsächlich flackernde Verbindung, der JSON-RPC-Roundtrip gegen einen Live-Daemon) nie Ende-zu-Ende geprüft wurde. Die Interop-Kette von `java.net.http.HttpClient` selbst wurde als solide bestätigt - ein eigenständiger Smoke-Test erreichte einen echten `java.net.ConnectException` an der echten Netzwerkgrenze gegen eine unerreichbare Testadresse, was beweist, dass die Verkabelung funktioniert, obwohl sie nie einen Live-Daemon berührt hat.
