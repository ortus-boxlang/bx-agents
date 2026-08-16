# twilio-gateway-agent

An agent reachable over SMS via a push-style `gateways/` entry (`type: "twilio"`) - webhook-driven like WhatsApp Cloud/Teams, generating a single `POST /webhooks/twilio` route. Inbound is form-urlencoded, not JSON, and signed with a genuinely different scheme (`X-Twilio-Signature`: HMAC-SHA1, base64) than every other webhook gateway in this repo.

## 1. Get a Twilio number

At the [Twilio Console](https://console.twilio.com), buy (or use a free trial) phone number with SMS capability. From the Console you'll need:

- **Account SID** → `TWILIO_ACCOUNT_SID`
- **Auth Token** → `TWILIO_AUTH_TOKEN`
- The number itself, in E.164 (`+1555...`) → `TWILIO_FROM_NUMBER`

## 2. Configure, build, and point the number at your webhook

```bash
export TWILIO_ACCOUNT_SID="AC..."
export TWILIO_AUTH_TOKEN="..."
export TWILIO_FROM_NUMBER="+15551234567"
bxAgents build
bxAgents serve --port=8080
```

Under the number's **Messaging Configuration** in the Twilio Console, set "A message comes in" to your public `POST /webhooks/twilio` URL (tunnel it with `ngrok http 8080` for local dev, and set the matching `publicUrl` override in `gateways/twilioChannel.bx` if the URL Twilio sees differs from the URL this app sees - the signature covers the exact request URL, so a mismatch here fails verification).

## 3. Simulate an inbound SMS locally

```bash
URL="http://localhost:8080/webhooks/twilio"
BODY_TEXT="Hello there"
FROM="+15559998888"
SID="SM00000000000000000000000000000000"

# Twilio's signing base: URL + every sorted "key & value" pair, no separators
BASE="${URL}AccountSid${TWILIO_ACCOUNT_SID}Body${BODY_TEXT}From${FROM}MessageSid${SID}To${TWILIO_FROM_NUMBER}"
SIG=$(printf '%s' "$BASE" | openssl dgst -sha1 -hmac "$TWILIO_AUTH_TOKEN" -binary | base64)

curl -X POST "$URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "X-Twilio-Signature: $SIG" \
  --data-urlencode "AccountSid=$TWILIO_ACCOUNT_SID" \
  --data-urlencode "Body=$BODY_TEXT" \
  --data-urlencode "From=$FROM" \
  --data-urlencode "MessageSid=$SID" \
  --data-urlencode "To=$TWILIO_FROM_NUMBER"
```

The synchronous response is always an empty TwiML `<Response></Response>` ack - the real reply goes out later, via a separate async `Messages.json` REST call once the agent's turn completes.

{% hint style="warning" %}
Human-in-the-loop is **degraded** here (no button/card affordance in SMS) - `requestHumanInteraction()` sends a plain-text SMS listing allowed decisions, correlated by the sender's phone number rather than a subject-line tag. See [Twilio SMS](../../docs/conventions/gateways.md#twilio-sms---a-genuinely-different-signature-scheme-and-a-dual-path-response-model).
{% endhint %}

See [Known Limitations](../../docs/known-limitations.md) for what's cross-verified against an independent Python `hmac` reference vs. what still needs a real Twilio number.
