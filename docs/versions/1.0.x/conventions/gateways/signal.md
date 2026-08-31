---
title: "gateways/ - Signal"
icon: phosphor-duotone:plugs-connected
summary: "Server-Sent Events push-style gateway against an external signal-cli daemon."
description: "Server-Sent Events push-style gateway against an external signal-cli daemon."
tags: [conventions, gateways, signal]
---

# Signal

Part of the push-style [gateways/](index.md) family - see there for the shared "secrets stay external" rule, `GatewaySession`, and the scheduler these gateways run under. This page covers Signal's own config shape and (where BxAgents does anything platform-specific) how it talks to Signal.

```javascript
// gateways/signalChannel.bx
class {
	function configure() {
		return {
			type         : "signal",
			accountEnvVar: "MY_SIGNAL_ACCOUNT"   // the signal-cli-registered phone number this gateway sends/receives as, E.164
			// httpUrl: "http://127.0.0.1:8080"   // optional override - defaults to "http://127.0.0.1:8080", where signal-cli's own daemon HTTP API is expected to be listening
		};
	}
}
```

**Validation:** `type: "signal"` requires `accountEnvVar`. Checked the same way a channel-adapter `http` entry's `secretEnvVar` is.

Generated registration statement:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.SignalGateway", { "account" : getSystemSetting( "MY_SIGNAL_ACCOUNT", "" ) } ) )
```

## Signal - a fourth transport shape, against an external `signal-cli` daemon

`SignalGateway` isn't webhook-driven like WhatsApp Cloud/Teams/Twilio/GitHub above, and it isn't a websocket like Slack/Discord either - it extends `ScheduledGatewayBase` the same way Telegram/Slack/Discord/Email do, but its own connection is **Server-Sent Events**: a single long-lived `GET {httpUrl}/api/v1/events?account=...` request held open via `java.net.http.HttpClient`'s async API (`sendAsync()` + `BodyHandlers.ofLines()`), reading one JSON event per line as signal-cli's own daemon pushes them down the same response body. Outbound sends are plain JSON-RPC 2.0 (`POST {httpUrl}/api/v1/rpc`, `{"jsonrpc":"2.0","method":"send","params":{...},"id":...}`) against the same daemon.

There is no official Signal bot API - `SignalGateway` talks entirely to [`signal-cli`](https://github.com/AsamK/signal-cli) running in its own `daemon --http` mode, an **external prerequisite** this gateway depends on but doesn't manage, the same relationship `EmailGateway` has with an external IMAP/SMTP server. Ported from [Hermes Agent's](https://github.com/NousResearch/hermes-agent) own real Signal channel - the SSE/JSON-RPC wire shapes, the reconnect backoff constants (2s to 60s exponential, +20% jitter), and the 30s/120s idle watchdog are all read directly from that source, not reimplemented from scratch.

!!! warning
    Getting a working `signal-cli` daemon is a real, manual, one-time setup step outside this project entirely: install `signal-cli`, register/link it to a real Signal account (`signal-cli link` or `register`, both require an actual phone number and a device-linking QR/verification step), then run `signal-cli -a <account> daemon --http=127.0.0.1:8080` and keep that process alive (a systemd service or container sidecar, not something `bxAgents serve` starts for you). `SignalGateway`'s own `onConnect()` fails loudly with `MissingConfig` if `account` isn't set, but it can't detect or start the daemon itself - `httpUrl` unreachable at connect time surfaces as an ordinary reconnect-backoff cycle, not a fast failure.

!!! info
    v1 is **DM-only** - Hermes's own Signal channel treats group conversations as opt-in/off by default, and that's the only mode ported here. Human-in-the-loop is degraded the same way Twilio/GitHub's fallback is (`getDeclaredCapabilities()` omits `"interactiveActions"`) - Signal read-receipts/reactions are write-only cosmetic status in signal-cli's own API, not a real answer channel, so `requestHumanInteraction()` falls back to a plain-text message listing the allowed decisions, correlated by conversationID like Twilio's own phone-number-keyed fallback. The JSON-RPC/SSE parsing logic (`handleSseEvent()`, quote-threading, group-message filtering, HITL decision matching) was driven through real public methods with only the outermost `rpcCaller`/`connector` I/O calls stubbed, the same seam-testing discipline as every other gateway - but no real `signal-cli` daemon was available in this environment, so the actual async connection lifecycle (opening the SSE stream, the reconnect-with-backoff loop against a genuinely flaky connection, the JSON-RPC round trip against a live daemon) has never been exercised end-to-end. The `java.net.http.HttpClient` interop chain itself was confirmed sound - a standalone smoke test reached a genuine `java.net.ConnectException` at the real network boundary against an unreachable test address, proving the plumbing works even though it's never touched a live daemon.
