# http-gateway-agent

An agent exposed over HTTP via a `gateways/` exposure entry, generating the agent API's four turn routes under `/api/chat` in `config/Router.bx`, served by the generated `handlers/AgentApi.bx` (the same handler as the always-on `/__bxagents` route, behind the same access switch).

```bash
bxAgents build
bxAgents serve --port=8080
```

The four routes are `invoke`, `stream`, `batch` and `info`:

```bash
curl -X POST http://localhost:8080/api/chat/invoke \
  -H "Content-Type: application/json" \
  -d '{"input":"What is the weather in Paris?"}'
```

```bash
curl http://localhost:8080/api/chat/info
```

```bash
curl -X POST http://localhost:8080/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"input":"What is the weather in Paris?"}'
```

`stream` answers server-sent events (`thread`, `chunk`, `done`). The route set is documented in [Call your agent from code](../../docs/guides/agent-api.md).

See [gateways/](../../docs/conventions/gateways/index.md).
