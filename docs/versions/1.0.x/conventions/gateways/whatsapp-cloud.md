---
title: "gateways/ - WhatsApp Business Cloud"
icon: phosphor-duotone:plugs-connected
summary: "Webhook-driven push-style gateway against Meta's Graph API."
description: "Webhook-driven push-style gateway against Meta's Graph API."
tags: [conventions, gateways, whatsappcloud]
---

# WhatsApp Business Cloud

Part of the push-style [gateways/](index.md) family - see there for the shared "secrets stay external" rule, `GatewaySession`, and the scheduler these gateways run under. This page covers WhatsApp Business Cloud's own config shape and (where BxAgents does anything platform-specific) how it talks to WhatsApp Business Cloud.

```javascript
// gateways/whatsappCloud.bx
class {
	function configure() {
		return {
			type               : "whatsapp-cloud",
			accessTokenEnvVar  : "WHATSAPP_ACCESS_TOKEN",     // Graph API access token
			phoneNumberIdEnvVar: "WHATSAPP_PHONE_NUMBER_ID",  // the WhatsApp Business phone number ID sends go through
			appSecretEnvVar    : "WHATSAPP_APP_SECRET",       // HMAC key verifying X-Hub-Signature-256 on inbound webhooks
			verifyTokenEnvVar  : "WHATSAPP_VERIFY_TOKEN"      // shared secret Meta's GET verify handshake must echo back
			// apiVersion: "v21.0"   // optional override - defaults to "v21.0"
		};
	}
}
```

**Validation:** `type: "whatsapp-cloud"` requires `accessTokenEnvVar`, `phoneNumberIdEnvVar`, `appSecretEnvVar`, and `verifyTokenEnvVar`. Checked the same way a channel-adapter `http` entry's `secretEnvVar` is.

Generated registration statement:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.whatsapp.WhatsAppCloudGateway", { "accessToken" : getSystemSetting( "WHATSAPP_ACCESS_TOKEN", "" ), "phoneNumberId" : getSystemSetting( "WHATSAPP_PHONE_NUMBER_ID", "" ), "appSecret" : getSystemSetting( "WHATSAPP_APP_SECRET", "" ), "verifyToken" : getSystemSetting( "WHATSAPP_VERIFY_TOKEN", "" ) } ) )
```

## WhatsApp Business Cloud API - webhook-driven, not connection-driven

`WhatsAppCloudGateway` is shaped differently from every other push-style gateway: Meta calls **us**, over a public webhook, rather than this gateway holding its own outbound connection (a poll task or a websocket). It extends bx-ai's `BaseGateway` directly, not `ScheduledGatewayBase` - there's no scheduler task or socket to manage, only a generated `handlers/WhatsAppCloud.bx` (written whenever a `whatsapp-cloud` gateway entry exists) wired to two fixed routes:

```javascript
get( "/webhooks/whatsapp-cloud" ).toHandler( "WhatsAppCloud.verify" )
post( "/webhooks/whatsapp-cloud" ).toHandler( "WhatsAppCloud.process" )
```

Both actions are thin passthroughs into the gateway's own `handleVerify()`/`handleWebhook()` - `verify` answers Meta's subscription handshake (`GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`, echoing the challenge back as plain text only when the mode and token match, constant-time compared); `process` verifies Meta's own `X-Hub-Signature-256` header (HMAC-SHA256 over the **exact raw POST body** - `event.getHTTPContent()`, never re-parsed/re-serialized JSON, which would change the bytes and break the signature) before parsing or dispatching anything. This is a genuinely different scheme from bx-ai's own `HttpGateway`/`GatewaySecurity` (different header names, different HMAC construction), so it isn't reused here - see the class's own docblock.

Ported directly from [Hermes Agent's](https://github.com/NousResearch/hermes-agent) own real, production WhatsApp Cloud adapter (`gateway/platforms/whatsapp_cloud.py`, MIT licensed) - the verify handshake, signature scheme, webhook payload walk (`entry[].changes[].value.{messages,contacts}`), outbound message/interactive-button shapes (≤3 allowed decisions render as native buttons, 4+ as a tap-to-open list, matching WhatsApp's own documented limits), and length limits (4096-char messages, 20-char button labels, 1024-char interactive body text) were all read directly from that source this session, not reimplemented from scratch. Inbound messages are deduplicated by their own `wamid` (Meta retries webhook delivery on any non-200 response for up to 7 days) via a bounded FIFO cache, mirroring Hermes's own `_dedup_wamid`.

!!! warning
    v1 scope, matching Hermes's own documented limitation: Cloud API DMs have no separate "chat" entity - `chat_id` IS the sender's `wa_id` - and group messages (which carry their own `chat` field identifying the group JID) are out of scope; media (image/video/document/audio) isn't downloaded, only a caption if present. Every other push-style gateway shares the same one-instance-per-type registry ceiling documented above - `whatsapp-cloud` is no exception.

!!! info
    The generated `handlers/WhatsAppCloud.bx`'s own ColdBox request-context calls (`event.getHTTPContent()`/`event.getHTTPHeader()`/`event.renderData()`, `rc`'s URL-scope-merged query params for the GET handshake) are the documented, standard ColdBox REST-handler idioms - but unlike the gateway's own signature/dispatch logic (thoroughly unit-tested and empirically verified against real HMAC/JSON behavior this session), this specific generated-route wiring has NOT been exercised against a real ColdBox boot. See known-limitations.md.

**There is no `"whatsapp-personal"` type.** The unofficial personal-account bridge (WhatsApp's multi-device Web protocol, the kind Hermes Agent reaches via a Node.js/Baileys subprocess) was researched but deliberately not built - the one MIT-licensed native-Java option (Cobalt, `com.github.auties00:cobalt`) turned out to pull in a commercial/proprietary dependency (`com.aspose:aspose-words`) at the version actually published to Maven Central, and a subprocess-bridge port was set aside in favor of a native-JVM approach. Declaring `type: "whatsapp-personal"` in a `gateways/*` entry fails validation with an "unknown type" error, same as any other unsupported type. See `docs/known-limitations.md` for the full investigation.
