# slack-gateway-agent

An agent reachable as a real Slack app via a push-style `gateways/` entry (`type: "slack"`), over **Socket Mode** - a persistent websocket the gateway holds open itself. No public webhook endpoint is needed or generated.

## 1. Create a Slack app

At [api.slack.com/apps](https://api.slack.com/apps), create an app "from scratch":

1. **Socket Mode** - enable it, generate an app-level token with the `connections:write` scope (`xapp-...`) → `SLACK_APP_TOKEN`.
2. **OAuth & Permissions** - add the `chat:write` bot scope, install the app to your workspace, copy the Bot User OAuth Token (`xoxb-...`) → `SLACK_BOT_TOKEN`.
3. **Event Subscriptions** - enable it and subscribe to the `message.im` (and/or `message.channels`) bot event, so the app actually receives message events over the socket.

## 2. Configure and run

```bash
export SLACK_BOT_TOKEN="xoxb-..."
export SLACK_APP_TOKEN="xapp-..."
bxAgents build
bxAgents serve
```

`SlackGateway` opens the Socket Mode connection as soon as `GatewaySession` starts. DM the bot (or mention it in a channel it's in) - replies stream back token-by-token via a placeholder message + `chat.update`.

{% hint style="info" %}
Like every other persistent-connection gateway in this directory, there's no `curl`-able entrypoint here - message the app for real in Slack to see it work.
{% endhint %}

See [Slack's persistent connection](../../docs/conventions/gateways.md#slacks-persistent-connection) for the reconnect model, and [Known Limitations](../../docs/known-limitations.md) for what is and isn't covered by automated tests.
