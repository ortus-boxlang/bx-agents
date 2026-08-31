---
title: "gateways/ - Slack"
icon: phosphor-duotone:plugs-connected
summary: "Persistent-websocket push-style gateway via Socket Mode."
description: "Persistent-websocket push-style gateway via Socket Mode."
tags: [conventions, gateways, slack]
---

# Slack

Part of the push-style [gateways/](index.md) family - see there for the shared "secrets stay external" rule, `GatewaySession`, and the scheduler these gateways run under. This page covers Slack's own config shape and (where BxAgents does anything platform-specific) how it talks to Slack.

```javascript
// gateways/slackChannel.bx
class {
	function configure() {
		return {
			type          : "slack",
			botTokenEnvVar: "SLACK_BOT_TOKEN",   // xoxb-... - chat.postMessage/chat.update
			appTokenEnvVar: "SLACK_APP_TOKEN"    // xapp-... - apps.connections.open (Socket Mode)
		};
	}
}
```

**Validation:** `type: "slack"` requires both `botTokenEnvVar` and `appTokenEnvVar`. Checked the same way a channel-adapter `http` entry's `secretEnvVar` is.

Generated registration statement:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.SlackGateway", { "appToken" : getSystemSetting( "SLACK_APP_TOKEN", "" ), "botToken" : getSystemSetting( "SLACK_BOT_TOKEN", "" ) } ) )
```

## Slack's persistent connection

`SlackGateway` holds its websocket via `java.net.http.HttpClient`'s async WebSocket client, bridged from a BoxLang listener class that `implements="java:java.net.http.WebSocket$Listener"` directly (`models/gateways/support/SlackSocketListener.bx`) - BoxLang compiles this as a real JVM implementer of the interface, confirmed empirically by handing an instance straight to `HttpClient.newWebSocketBuilder().buildAsync( uri, listener )` with no casting error (only the expected `java.net.ConnectException` once the real network boundary was reached). Only the methods the class actually declares override the JDK interface's `default` methods; anything left unimplemented falls through to the JDK's own default behavior automatically. This is the reference pattern every other persistent-connection gateway (Discord, below) follows too.

Reconnects are driven reactively by Slack's own protocol signals - a `disconnect` frame (`warning`/`refresh_requested`) or an unexpected socket close - opening a **new** connection before closing the old one, per Slack's documented recommendation. A lightweight scheduler watchdog (`slack-watchdog-<name>`, every 30s) is only a safety net for the case neither of those signals fires.
