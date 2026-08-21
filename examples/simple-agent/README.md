# simple-agent

A baseline agent combining two things most real projects need together: one
`tools/` function and an HTTP exposure via `gateways/`. Where `minimal-agent/`
and `http-gateway-agent/` each demonstrate one convention in isolation, this
example shows them wired up in the same project.

```bash
bxAgents build
bxAgents serve --port=8080
```

```bash
curl -X POST http://localhost:8080/api/chat/invoke \
  -H "Content-Type: application/json" \
  -d '{"input":"Greet Ada"}'
```

{% hint style="warning" %}
The very first request to a freshly booted app's `toAi()` route can transiently fail - see [Known Limitations](../../docs/known-limitations.md#the-toai-first-request-race). Send a warm-up request first.
{% endhint %}

See [tools/](../../docs/conventions/tools.md) and [gateways/](../../docs/conventions/gateways.md).
