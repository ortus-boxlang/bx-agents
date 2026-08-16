# teams-gateway-agent

An agent reachable over Microsoft Teams via a push-style `gateways/` entry (`type: "teams"`) - webhook-driven like `whatsapp-cloud-gateway-agent`, using the Bot Framework Activity protocol. Generates a single `POST /webhooks/teams` route.

## 1. Register a bot with the Bot Framework

At the [Azure Portal](https://portal.azure.com), create an **Azure Bot** resource (or a plain Entra ID app registration + manual Bot Framework registration):

- Copy the **Application (client) ID** → `TEAMS_APP_ID`
- Under **Certificates & secrets**, create a client secret → `TEAMS_APP_PASSWORD`
- Set the bot's **Messaging endpoint** to your public `POST /webhooks/teams` URL (a tunnel like `ngrok` for local dev)
- Under **Channels**, add the **Microsoft Teams** channel

Then sideload the bot into Teams (via a Teams app manifest referencing the same App ID) to actually message it.

## 2. Configure and run

```bash
export TEAMS_APP_ID="..."
export TEAMS_APP_PASSWORD="..."
bxAgents build
bxAgents serve --port=8080
```

Unlike WhatsApp Cloud, there's no GET verify-handshake - every inbound activity arrives as a bearer-JWT-signed `POST`, verified against Bot Connector's own JWKS rather than an HMAC body signature. DM the bot in Teams - `TeamsGateway` fetches an OAuth2 token (client-credentials flow) and replies via the Bot Connector REST API.

{% hint style="warning" %}
v1 scope is **personal (1:1 DM) conversations only** - group chat and channel-wide messages aren't supported. See [Microsoft Teams - Bot Framework Activity protocol](../../docs/conventions/gateways.md#microsoft-teams---bot-framework-activity-protocol).
{% endhint %}

See [Known Limitations](../../docs/known-limitations.md) for what's verified via a real locally-generated RSA keypair + hand-signed JWTs vs. what still needs a real Azure/Bot Framework registration and a real Teams client.
