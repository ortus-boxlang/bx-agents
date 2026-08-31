---
title: "gateways/ - Microsoft Teams"
icon: phosphor-duotone:plugs-connected
summary: "Webhook-driven push-style gateway using the Bot Framework Activity protocol."
description: "Webhook-driven push-style gateway using the Bot Framework Activity protocol."
tags: [conventions, gateways, teams]
---

# Microsoft Teams

Part of the push-style [gateways/](index.md) family - see there for the shared "secrets stay external" rule, `GatewaySession`, and the scheduler these gateways run under. This page covers Microsoft Teams's own config shape and (where BxAgents does anything platform-specific) how it talks to Microsoft Teams.

```javascript
// gateways/teamsChannel.bx
class {
	function configure() {
		return {
			type                : "teams",
			appIdEnvVar         : "TEAMS_APP_ID",         // the bot's own Microsoft App ID (also the inbound JWT's required aud claim)
			appPasswordEnvVar   : "TEAMS_APP_PASSWORD"    // OAuth2 client-credentials secret
			// tenantId: "..."   // optional override for single-tenant apps - defaults to "botframework.com" (multi-tenant)
		};
	}
}
```

**Validation:** `type: "teams"` requires `appIdEnvVar` and `appPasswordEnvVar`. Checked the same way a channel-adapter `http` entry's `secretEnvVar` is.

Generated registration statement:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.TeamsGateway", { "appId" : getSystemSetting( "TEAMS_APP_ID", "" ), "appPassword" : getSystemSetting( "TEAMS_APP_PASSWORD", "" ) } ) )
```

## Microsoft Teams - Bot Framework Activity protocol

`TeamsGateway` is webhook-driven the same way `WhatsAppCloudGateway` is - it extends `BaseGateway` directly, and Microsoft's own Bot Connector service calls **us**, over a single generated route:

```javascript
post( "/webhooks/teams" ).toHandler( "Teams.process" )
```

Unlike WhatsApp Cloud there's no GET verify handshake (Bot Framework has no equivalent of Meta's `hub.challenge`) - every inbound activity arrives as a signed POST, verified via a **bearer JWT** in the `Authorization` header rather than an HMAC signature over the body. The JWT is checked against Bot Connector's own JWKS (`https://login.botframework.com/v1/.well-known/openidconfiguration` → its `jwks_uri`) - RS256 signature, `aud` must equal the bot's own configured `appId`, `iss` must equal Bot Connector's fixed issuer string (`https://api.botframework.com`), both with a 5-minute clock-skew allowance. This is genuine RSA/JWT verification built from BoxLang's own Java interop (`java.security.Signature`, `java.security.KeyFactory`, `java.math.BigInteger`) - no external JWT library. Outbound calls use a separate OAuth2 client-credentials token (fetched from `login.microsoftonline.com/{tenantId}/oauth2/v2.0/token`, cached and refetched 60s before its stated expiry).

Ported from [Vercel Eve's](https://github.com/vercel/eve) real Teams channel (`packages/eve/src/public/channels/teams/`, MIT licensed) - the OAuth2 flow, the JWT verification scheme, the `v3/conversations/{id}/activities[/{activityId}]` REST triad, and the Adaptive Card human-in-the-loop shape (schema 1.5, one `Action.Submit` button per allowed decision) all mirror that implementation. **Hermes Agent's own `msgraph_webhook.py` is unrelated** despite the similar "Microsoft webhook" naming - it implements Microsoft Graph *change-notification* webhooks (mailbox/drive/list resource-change events, a different Microsoft product surface with no working outbound Teams messaging at all) and nothing from it was ported here.

!!! warning
    v1 scope is **personal (1:1 DM) conversations only** - group chat and channel-wide messages need bot-mention gating and a different reply-threading model that Eve itself implements but this port doesn't, matching every other push-style gateway's own DM-first v1 scoping. A message chunk limit of 4000 chars is used (Eve's own Adaptive Card text-truncation constant) rather than the Bot Framework protocol's true 80 KiB ceiling, for UI readability.

!!! info
    The Bot Connector JWKS is fetched once and cached for the gateway instance's lifetime - if Microsoft ever rotates its signing keys without a matching `kid` already cached, verification would start failing until the gateway (and thus the whole app) restarts. No periodic cache invalidation is built for v1. The JWT verification logic itself was empirically verified this session against a real, locally-generated RSA keypair and hand-signed test JWTs (valid signature accepted, tampered signature/wrong audience/expired token all rejected with 401) - not just read against Eve's source.
