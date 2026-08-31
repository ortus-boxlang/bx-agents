---
title: "gateways/ - Discord"
icon: phosphor-duotone:plugs-connected
summary: "Persistent-websocket push-style gateway via the real Gateway API."
description: "Persistent-websocket push-style gateway via the real Gateway API."
tags: [conventions, gateways, discord]
---

# Discord

Part of the push-style [gateways/](index.md) family - see there for the shared "secrets stay external" rule, `GatewaySession`, and the scheduler these gateways run under. This page covers Discord's own config shape and (where BxAgents does anything platform-specific) how it talks to Discord.

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

**Validation:** `type: "discord"` requires `botTokenEnvVar`. Checked the same way a channel-adapter `http` entry's `secretEnvVar` is.

Generated registration statement:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.DiscordGateway", { "botToken" : getSystemSetting( "DISCORD_BOT_TOKEN", "" ) } ) )
```

## Discord's persistent connection - mandatory client-driven heartbeats

`DiscordGateway` connects the same way (`models/gateways/support/DiscordSocketListener.bx`, same `implements="java:java.net.http.WebSocket$Listener"` pattern as Slack), but Discord's Gateway protocol has a requirement Slack's Socket Mode doesn't: the server's own `Hello` frame (opcode 10) tells the client a `heartbeat_interval`, and the client must keep sending `Heartbeat` frames (opcode 1) on that cadence itself or Discord treats the connection as "zombied" and drops it. Since the interval is only known once `Hello` arrives (not before connecting), the heartbeat is registered as its own scheduler task (`discord-heartbeat-<name>`) dynamically from inside the frame handler, re-registered on every fresh `Hello` - distinct from every other push-style gateway's fixed-at-`registerScheduledTasks()`-time task(s), and distinct from Discord's own safety-net watchdog (`discord-watchdog-<name>`, every 30s, same role as Slack's).

Each heartbeat tick checks whether the *previous* heartbeat was ever acknowledged (`Heartbeat ACK`, opcode 11) - if not, the connection is zombied and gets reconnected proactively rather than left to time out. Reconnects otherwise follow Discord's own documented session model: a `Reconnect` frame (opcode 7) or most close codes trigger a `Resume` (opcode 6, replaying the last sequence number) on the new connection when a prior session exists; an `Invalid Session` frame (opcode 9) with `d: false`, or a close code Discord documents as session-invalidating (`4007`, `4009`), instead forces a fresh `Identify` (opcode 2). A small, fixed set of close codes (`4004` bad token, `4010` invalid shard, `4011` sharding required, `4012` invalid API version, `4013`/`4014` invalid/disallowed intents) are non-recoverable per Discord's own docs - the gateway stops rather than retrying a connection that would just fail again.

!!! warning
    `MESSAGE_CONTENT` (needed to read message text at all, in both guild channels and DMs) is a Discord **privileged** Gateway Intent - it must be explicitly enabled for your bot in the Discord Developer Portal, and once your app is verified (100+ guilds), approved by Discord. Without it, every inbound message arrives with an empty `content` field.
