---
title: "gateways/ - Discord"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, discord]
---

# Discord

Teil der Push-Style-[gateways/](index.md)-Familie - dort werden die gemeinsame Regel "Secrets bleiben extern", `GatewaySession`, und der Scheduler erklärt, unter dem diese Gateways laufen. Diese Seite behandelt Discords eigene Config-Form und (wo BxAgents etwas Plattform-Spezifisches tut) wie sie mit Discord kommuniziert.

```javascript
// gateways/discordChannel.bx
class {
	function configure() {
		return {
			type          : "discord",
			botTokenEnvVar: "DISCORD_BOT_TOKEN"   // Authorization: Bot <token> on every REST call and inside Identify
			// intents: 37377   // optional override - defaults to GUILDS+GUILD_MESSAGES+DIRECT_MESSAGES+MESSAGE_CONTENT
		};
	}
}
```

`type: "discord"` erfordert `botTokenEnvVar`. Wird auf dieselbe Weise geprüft wie der `secretEnvVar` eines Channel-Adapter-`http`-Eintrags.

Generierte Registrierungsanweisung:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.DiscordGateway", { "botToken" : getSystemSetting( "DISCORD_BOT_TOKEN", "" ) } ) )
```

## Discords persistente Verbindung - obligatorische, clientseitig getriebene Heartbeats

`DiscordGateway` verbindet sich auf dieselbe Weise (`models/gateways/support/DiscordSocketListener.bx`, dasselbe Muster `implements="java:java.net.http.WebSocket$Listener"` wie Slack), aber Discords Gateway-Protokoll hat eine Anforderung, die Slacks Socket Mode nicht hat: Der eigene `Hello`-Frame des Servers (Opcode 10) teilt dem Client ein `heartbeat_interval` mit, und der Client muss selbst in diesem Takt `Heartbeat`-Frames (Opcode 1) senden, sonst behandelt Discord die Verbindung als "zombiert" und trennt sie. Da das Intervall erst bekannt ist, sobald `Hello` eintrifft (nicht vor dem Verbinden), wird der Heartbeat als eigener Scheduler-Task (`discord-heartbeat-<name>`) dynamisch aus dem Frame-Handler heraus registriert, bei jedem neuen `Hello` neu registriert - anders als bei jedem anderen Push-Style-Gateway mit seinem/seinen zur `registerScheduledTasks()`-Zeit fixierten Task(s), und anders als Discords eigenem Sicherheitsnetz-Watchdog (`discord-watchdog-<name>`, alle 30s, dieselbe Rolle wie bei Slack).

Jeder Heartbeat-Tick prüft, ob der *vorherige* Heartbeat je bestätigt wurde (`Heartbeat ACK`, Opcode 11) - falls nicht, ist die Verbindung zombiert und wird proaktiv neu verbunden, statt sie in ein Timeout laufen zu lassen. Reconnects folgen ansonsten Discords eigenem dokumentiertem Sitzungsmodell: Ein `Reconnect`-Frame (Opcode 7) oder die meisten Close-Codes lösen ein `Resume` aus (Opcode 6, das die letzte Sequenznummer wiedergibt) auf der neuen Verbindung, falls eine vorherige Sitzung existiert; ein `Invalid Session`-Frame (Opcode 9) mit `d: false`, oder ein von Discord als sitzungsinvalidierend dokumentierter Close-Code (`4007`, `4009`), erzwingt stattdessen ein frisches `Identify` (Opcode 2). Eine kleine, feste Menge von Close-Codes (`4004` falsches Token, `4010` ungültiger Shard, `4011` Sharding erforderlich, `4012` ungültige API-Version, `4013`/`4014` ungültige/nicht erlaubte Intents) sind laut Discords eigener Dokumentation nicht wiederherstellbar - das Gateway stoppt, statt eine Verbindung erneut zu versuchen, die ohnehin wieder fehlschlagen würde.

!!! warning
    `MESSAGE_CONTENT` (nötig, um Nachrichtentext überhaupt zu lesen, sowohl in Guild-Kanälen als auch in DMs) ist ein **privilegierter** Discord-Gateway-Intent - er muss für den eigenen Bot im Discord Developer Portal explizit aktiviert werden, und sobald die eigene App verifiziert ist (100+ Guilds), von Discord genehmigt werden. Ohne ihn kommt jede eingehende Nachricht mit einem leeren `content`-Feld an.
