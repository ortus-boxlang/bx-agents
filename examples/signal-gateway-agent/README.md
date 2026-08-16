# signal-gateway-agent

An agent reachable over Signal DM via a push-style `gateways/` entry (`type: "signal"`) - a genuinely different transport shape from every other push-style gateway in this directory: **Server-Sent Events**, held open via `java.net.http.HttpClient`'s async API against a locally-run [`signal-cli`](https://github.com/AsamK/signal-cli) daemon, rather than a webhook, poll, or websocket.

## 1. There is no official Signal bot API

`SignalGateway` doesn't talk to Signal's own servers directly - it talks entirely to `signal-cli` running in its own HTTP daemon mode, a real, manually-managed prerequisite outside this project's control (the same relationship `email-gateway-agent` has with a real IMAP/SMTP server):

```bash
# install signal-cli (see https://github.com/AsamK/signal-cli#installation), then:
signal-cli -a +15551234567 register                # or `link` to attach as a secondary device
signal-cli -a +15551234567 verify 123456            # the SMS/call verification code
signal-cli -a +15551234567 daemon --http=127.0.0.1:8081
```

Keep that `daemon` process running (a systemd service or container sidecar in production) - `bxAgents serve` does not start or manage it.

## 2. Configure and run

```bash
export SIGNAL_ACCOUNT="+15551234567"
bxAgents build
bxAgents serve --port=8080
```

`gateways/signalChannel.bx` points `httpUrl` at `http://127.0.0.1:8081` - a different port than this app's own `serve --port=8080`, since both are local HTTP servers and would otherwise collide. `SignalGateway` opens the SSE connection to the daemon as soon as `GatewaySession` starts. Message the linked number from another Signal account - the reply goes out as a JSON-RPC `send` call to the same daemon.

{% hint style="warning" %}
v1 is **DM-only** - Signal group conversations are out of scope. Human-in-the-loop is degraded the same way Twilio/GitHub's fallback is: Signal reactions/read-receipts are write-only cosmetic status, not a real answer channel, so approval requests arrive as plain text listing the allowed decisions. See [Signal - a fourth transport shape](../../docs/conventions/gateways.md#signal---a-fourth-transport-shape-against-an-external-signal-cli-daemon).
{% endhint %}

{% hint style="info" %}
Like the other persistent-connection gateways in this directory, there's no `curl`-able entrypoint - `signal-cli` and a second real Signal account are needed to see this work end-to-end. See [Known Limitations](../../docs/known-limitations.md) for exactly what was smoke-tested against real `HttpClient` interop vs. what still needs a real, running daemon.
{% endhint %}
