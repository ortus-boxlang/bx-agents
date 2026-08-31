---
title: "gateways/ - Discord"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, discord]
---

# Discord

Parte de la familia de gateways de estilo push [gateways/](index.md) - allí se explica la regla compartida de que "los secretos permanecen externos", `GatewaySession`, y el scheduler bajo el que se ejecutan estos gateways. Esta página cubre la forma de configuración propia de Discord y (cuando BxAgents hace algo específico de la plataforma) cómo se comunica con Discord.

```javascript
// gateways/discordChannel.bx
class {
	function configure() {
		return {
			type          : "discord",
			botTokenEnvVar: "DISCORD_BOT_TOKEN"   // Authorization: Bot <token> en cada llamada REST y dentro de Identify
			// intents: 37377   // override opcional - por defecto GUILDS+GUILD_MESSAGES+DIRECT_MESSAGES+MESSAGE_CONTENT
		};
	}
}
```

`type: "discord"` requiere `botTokenEnvVar`. Comprobado de la misma manera que el `secretEnvVar` de una entrada channel-adapter `http`.

Sentencia de registro generada:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.DiscordGateway", { "botToken" : getSystemSetting( "DISCORD_BOT_TOKEN", "" ) } ) )
```

## La conexión persistente de Discord - latidos obligatorios impulsados por el cliente

`DiscordGateway` se conecta de la misma manera (`models/gateways/support/DiscordSocketListener.bx`, el mismo patrón `implements="java:java.net.http.WebSocket$Listener"` que Slack), pero el protocolo Gateway de Discord tiene un requisito que el Socket Mode de Slack no tiene: el propio frame `Hello` del servidor (opcode 10) le dice al cliente un `heartbeat_interval`, y el cliente debe seguir enviando frames `Heartbeat` (opcode 1) en esa cadencia por sí mismo o Discord trata la conexión como "zombificada" y la cierra. Ya que el intervalo solo se conoce una vez que llega `Hello` (no antes de conectar), el latido se registra como su propia tarea de scheduler (`discord-heartbeat-<name>`) dinámicamente desde dentro del manejador de frame, re-registrada en cada `Hello` fresco - distinto de la(s) tarea(s) fija(s)-en-el-momento-de-`registerScheduledTasks()` de cada otro gateway de estilo push, y distinto del propio watchdog de red de seguridad de Discord (`discord-watchdog-<name>`, cada 30s, el mismo rol que el de Slack).

Cada tick de latido comprueba si el latido *anterior* fue alguna vez confirmado (`Heartbeat ACK`, opcode 11) - si no, la conexión está zombificada y se reconecta proactivamente en lugar de dejarla expirar por tiempo. Las reconexiones de lo contrario siguen el propio modelo de sesión documentado de Discord: un frame `Reconnect` (opcode 7) o la mayoría de los códigos de cierre disparan un `Resume` (opcode 6, reproduciendo el último número de secuencia) en la nueva conexión cuando existe una sesión previa; un frame `Invalid Session` (opcode 9) con `d: false`, o un código de cierre que Discord documenta como invalidador de sesión (`4007`, `4009`), en cambio fuerza un `Identify` fresco (opcode 2). Un conjunto pequeño y fijo de códigos de cierre (`4004` token malo, `4010` shard inválido, `4011` sharding requerido, `4012` versión de API inválida, `4013`/`4014` intents inválidos/no permitidos) no son recuperables según la propia documentación de Discord - el gateway se detiene en lugar de reintentar una conexión que simplemente fallaría de nuevo.

!!! warning
    `MESSAGE_CONTENT` (necesario para leer el texto del mensaje en absoluto, tanto en canales de guild como en DMs) es un Gateway Intent **privilegiado** de Discord - debe habilitarse explícitamente para tu bot en el Discord Developer Portal, y una vez que tu app está verificada (100+ guilds), aprobado por Discord. Sin él, cada mensaje entrante llega con un campo `content` vacío.
