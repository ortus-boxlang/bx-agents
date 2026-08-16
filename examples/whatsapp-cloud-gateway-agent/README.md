# whatsapp-cloud-gateway-agent

An agent reachable over WhatsApp via a push-style `gateways/` entry (`type: "whatsapp-cloud"`) - the first **webhook-driven** shape in this directory: Meta calls *this app*, over a public HTTP endpoint, rather than the gateway holding its own outbound connection. Generates `GET`/`POST /webhooks/whatsapp-cloud` routes automatically.

## 1. Create a Meta app + WhatsApp product

At [developers.facebook.com](https://developers.facebook.com/apps), create an app, add the **WhatsApp** product, and from its API Setup page grab:

- A temporary (or, for production, permanent System User) access token → `WHATSAPP_ACCESS_TOKEN`
- The test phone number's **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`
- The app's **App Secret** (App Settings → Basic) → `WHATSAPP_APP_SECRET`
- Pick any string of your own as the webhook verify token → `WHATSAPP_VERIFY_TOKEN`

## 2. Configure, build, and expose the webhook publicly

```bash
export WHATSAPP_ACCESS_TOKEN="..."
export WHATSAPP_PHONE_NUMBER_ID="..."
export WHATSAPP_APP_SECRET="..."
export WHATSAPP_VERIFY_TOKEN="my-verify-token"
bxAgents build
bxAgents serve --port=8080
```

Meta needs to reach `POST /webhooks/whatsapp-cloud` over the public internet - for local development, tunnel it (e.g. `ngrok http 8080`) and configure the resulting HTTPS URL under **WhatsApp → Configuration → Webhook** in the Meta App Dashboard, subscribing to the `messages` field. Meta calls `GET /webhooks/whatsapp-cloud?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...` once to confirm the endpoint - it only succeeds if `hub.verify_token` matches `WHATSAPP_VERIFY_TOKEN`.

## 3. Simulate an inbound webhook locally

Once you have a real `WHATSAPP_APP_SECRET`, you can sign and POST a test payload by hand instead of waiting on a real WhatsApp message:

```bash
BODY='{"entry":[{"changes":[{"value":{"messages":[{"from":"15551234567","id":"wamid.TEST","type":"text","text":{"body":"Hello"}}],"contacts":[{"wa_id":"15551234567"}]}}]}]}'
SIG="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WHATSAPP_APP_SECRET" | sed 's/^.* //')"

curl -X POST http://localhost:8080/webhooks/whatsapp-cloud \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: $SIG" \
  -d "$BODY"
```

{% hint style="warning" %}
v1 scope is WhatsApp DMs only (no group messages), and media isn't downloaded - only a caption if present. See [WhatsApp Business Cloud API](../../docs/conventions/gateways.md#whatsapp-business-cloud-api---webhook-driven-not-connection-driven).
{% endhint %}

See [Known Limitations](../../docs/known-limitations.md) for what's verified via real HMAC cross-checks vs. what still needs a real ColdBox boot + real Meta webhook test.
