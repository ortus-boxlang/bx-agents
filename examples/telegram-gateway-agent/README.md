# telegram-gateway-agent

An agent reachable as a real Telegram bot via a push-style `gateways/` entry (`type: "telegram"`). Unlike `http-gateway-agent`, nothing here is driven by an inbound HTTP request - `TelegramGateway` holds its own connection to Telegram (a scheduled long-poll against `getUpdates`) and pushes inbound messages to the agent as they arrive.

## 1. Get a bot token

Message [@BotFather](https://t.me/BotFather) on Telegram, run `/newbot`, and follow the prompts. You'll get back a token that looks like `123456789:AAH...`.

## 2. Configure and run

```bash
export TELEGRAM_BOT_TOKEN="123456789:AAH..."
bxAgents build
bxAgents serve
```

`bxAgents serve` boots a real ColdBox app; a generated `interceptors/GatewaySessionBootstrap.bx` starts a `GatewaySession` that connects `TelegramGateway` right away. Message your bot on Telegram - the reply comes back through the same long-poll connection, chunked automatically at Telegram's 4096-character message limit.

{% hint style="info" %}
This is the only example in this directory with no `curl`-able entrypoint - the whole point of a push-style gateway is that the platform talks to *it*, not the other way around. To see it work you need a real bot token and a real Telegram client.
{% endhint %}

See [gateways/](../../docs/conventions/gateways.md) for the full push-style gateway model (transport shapes, `GatewaySession`, HITL, logging), and [Known Limitations](../../docs/known-limitations.md) for what is and isn't covered by automated tests for this gateway.
