# http-gateway-agent

An agent exposed over HTTP via a `gateways/` exposure entry, generating a real `route("/api/chat").toAi("GeneratedAgent")` in `config/Router.bx`.

```bash
bxAgents build
bxAgents serve --port=8080
```

`toAi()` auto-registers four routes:

```bash
curl -X POST http://localhost:8080/api/chat/invoke \
  -H "Content-Type: application/json" \
  -d '{"input":"What is the weather in Paris?"}'
```

```bash
curl http://localhost:8080/api/chat/info
```

{% hint style="warning" %}
The very first request to a freshly booted app's `toAi()` route can transiently fail. Send a warm-up request first.
{% endhint %}

See [gateways/](../../docs/conventions/gateways/index.md).
