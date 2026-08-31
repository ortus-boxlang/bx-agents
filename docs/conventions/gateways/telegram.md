---
title: "gateways/ - Telegram"
icon: phosphor-duotone:plugs-connected
summary: "Long-poll push-style gateway - getUpdates on a scheduled task."
description: "Long-poll push-style gateway - getUpdates on a scheduled task."
tags: [conventions, gateways, telegram]
---

# Telegram

Part of the push-style [gateways/](index.md) family - see there for the shared "secrets stay external" rule, `GatewaySession`, and the scheduler these gateways run under. This page covers Telegram's own config shape and (where BxAgents does anything platform-specific) how it talks to Telegram.

```javascript
// gateways/telegramChannel.bx
class {
	function configure() {
		return {
			type          : "telegram",
			botTokenEnvVar: "TELEGRAM_BOT_TOKEN"
		};
	}
}
```

**Validation:** `type: "telegram"` requires `botTokenEnvVar`. Checked the same way a channel-adapter `http` entry's `secretEnvVar` is.

Generated registration statement:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.TelegramGateway", { "botToken" : getSystemSetting( "TELEGRAM_BOT_TOKEN", "" ) } ) )
```
