---
title: "gateways/ - Twilio SMS"
icon: phosphor-duotone:plugs-connected
summary: "Webhook-driven push-style gateway - form-urlencoded, HMAC-SHA1 signatures, dual-path TwiML response."
description: "Webhook-driven push-style gateway - form-urlencoded, HMAC-SHA1 signatures, dual-path TwiML response."
tags: [conventions, gateways, twilio]
---

# Twilio SMS

Part of the push-style [gateways/](index.md) family - see there for the shared "secrets stay external" rule, `GatewaySession`, and the scheduler these gateways run under. This page covers Twilio SMS's own config shape and (where BxAgents does anything platform-specific) how it talks to Twilio SMS.

```javascript
// gateways/twilioChannel.bx
class {
	function configure() {
		return {
			type            : "twilio",
			accountSidEnvVar: "TWILIO_ACCOUNT_SID",
			authTokenEnvVar : "TWILIO_AUTH_TOKEN",   // also the X-Twilio-Signature HMAC key
			fromEnvVar      : "TWILIO_FROM_NUMBER"   // the Twilio phone number outbound sends go through, E.164
			// messagingServiceSid: "MG..."   // optional - if set, used instead of `from` on outbound sends
			// publicUrl: "https://your-real-public-host/webhooks/twilio"   // optional override for reverse-proxy/tunnel deployments - see the Twilio subsection below
		};
	}
}
```

**Validation:** `type: "twilio"` requires `accountSidEnvVar`, `authTokenEnvVar`, and `fromEnvVar`. Checked the same way a channel-adapter `http` entry's `secretEnvVar` is.

Generated registration statement:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.TwilioGateway", { "accountSid" : getSystemSetting( "TWILIO_ACCOUNT_SID", "" ), "authToken" : getSystemSetting( "TWILIO_AUTH_TOKEN", "" ), "from" : getSystemSetting( "TWILIO_FROM_NUMBER", "" ) } ) )
```

## Twilio SMS - a genuinely different signature scheme, and a dual-path response model

`TwilioGateway` is webhook-driven the same way `WhatsAppCloudGateway`/`TeamsGateway` are:

```javascript
post( "/webhooks/twilio" ).toHandler( "Twilio.process" )
```

Two things make Twilio's own webhook contract meaningfully different from every other gateway in this project, both ported faithfully from Vercel Eve's real Twilio channel (`packages/eve/src/public/channels/twilio/`, MIT licensed):

- **The inbound body is form-urlencoded** (`Body`, `From`, `To`, `MessageSid`, `AccountSid`), not JSON - `TwilioGateway` parses it itself (`java.net.URLDecoder`), no JSON deserialization involved.
- **Signature verification is `X-Twilio-Signature`: HMAC-SHA1, base64-encoded** (every other webhook gateway in this project uses HMAC-SHA256, hex-encoded) - the signing base is the exact request URL followed by every POST param's own `key & value` concatenated directly (no separators), sorted alphabetically by key. Because the URL itself is part of what's signed, a project running behind a reverse proxy or tunnel (where the URL ColdBox sees via `event.getUrl()` doesn't match what Twilio actually POSTed to) needs the optional `publicUrl` config override - the same class of gotcha Eve's own docs flag for its `webhookUrl` option.
- **The synchronous webhook response is always an empty TwiML `<Response></Response>`** - Twilio's own classic dual-path model. The real agent reply is sent later, out-of-band, via a separate `deliver()` REST call to the Messages API once GatewaySession's async turn completes - matching Eve's own `emptyTwilioResponse()` exactly (Eve never uses a synchronous TwiML `<Message>` to answer inline).

Outbound sends are Basic-Auth REST calls to `POST /2010-04-01/Accounts/{AccountSid}/Messages.json`, form-encoded body (`To`, `Body`, and either `From` or `MessagingServiceSid` if configured). v1 is SMS-text only - Eve's own Twilio channel is a combined SMS+voice channel (`/voice` routes, `<Gather>`/`<Say>` TwiML, call transcription); none of the voice-specific pieces were ported.

!!! warning
    SMS has **no native button/card affordance at all** (confirmed via Eve's own docs), so human-in-the-loop is degraded the same way Email's is - `getDeclaredCapabilities()` omits `"interactiveActions"` (and `"threads"`, since Twilio's classic Messages API has no native reply/quote concept either). `requestHumanInteraction()` sends a plain-text SMS listing the allowed decisions; unlike Email (which embeds a `[bxagents:<requestID>]` tag in the Subject line to correlate the eventual reply), SMS has no subject line to tag - so the pending request is keyed by the sender's own phone number (conversationID) instead, a v1 simplification that assumes at most one open HITL request per phone number at a time.

!!! info
    Unlike Eve (which has no length-limiting logic at all - confirmed absent by grepping its source - and relies entirely on Twilio's own server-side segmentation), `TwilioGateway` still applies `MessageChunker` at 1600 chars (Twilio's own documented single-message concatenation ceiling) for consistency with every other gateway's chunking behavior. The HMAC-SHA1 signature scheme was cross-verified this session against an independently computed Python `hmac`/`hashlib` reference value before trusting the BoxLang implementation, the same discipline used for WhatsApp Cloud's own HMAC-SHA256 scheme.
