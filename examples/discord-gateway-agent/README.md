# discord-gateway-agent

An agent reachable as a real Discord bot via a push-style `gateways/` entry (`type: "discord"`), over Discord's real **Gateway API** - a persistent websocket with mandatory client-driven heartbeats, not the alternative HTTP Interactions webhook mode.

## 1. Create a Discord application

At the [Discord Developer Portal](https://discord.com/developers/applications), create a New Application, then under **Bot**:

1. Copy the bot token → `DISCORD_BOT_TOKEN`.
2. Enable the **Message Content Intent** (a *privileged* intent) - without it, every inbound message arrives with an empty `content` field. Under 100 guilds this just needs to be toggled on; past that it requires Discord's own bot verification.
3. Under **OAuth2 → URL Generator**, pick the `bot` scope + `Send Messages`/`Read Message History` permissions, and use the generated URL to invite the bot to a test server.

## 2. Configure and run

```bash
export DISCORD_BOT_TOKEN="..."
bxAgents build
bxAgents serve
```

`DiscordGateway` opens the Gateway websocket connection as soon as `GatewaySession` starts, sending `Identify` and then client-driven `Heartbeat` frames on the server-specified interval. DM the bot (or mention it in a server channel it's in) - replies stream back via a placeholder message + a `PATCH` edit, chunked at Discord's 2000-character limit.

{% hint style="info" %}
Like every other persistent-connection gateway in this directory, there's no `curl`-able entrypoint here - message the bot for real in Discord to see it work.
{% endhint %}

See [Discord's persistent connection](../../docs/conventions/gateways.md#discords-persistent-connection---mandatory-client-driven-heartbeats) for the heartbeat/reconnect model, and [Known Limitations](../../docs/known-limitations.md) for what is and isn't covered by automated tests.
