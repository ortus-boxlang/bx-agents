# api-agent

An agent that other programs call. Every route of its [HTTP API](../../docs/guides/agent-api.md) needs a token, and an admin can make and revoke tokens over the API.

```bash
export TOKEN_FOR_ADMIN=change-me
bxAgents build
bxAgents serve            # http://127.0.0.1:8080/__bxagents
```

Then, in another terminal:

```bash
# from the command line
curl -H "x-bxagents-token: $TOKEN_FOR_ADMIN" http://127.0.0.1:8080/__bxagents/whoami
curl -H "x-bxagents-token: $TOKEN_FOR_ADMIN" -H "Content-Type: application/json" \
     -d '{"input":"Hello"}' http://127.0.0.1:8080/__bxagents/invoke

# from BoxLang
boxlang client.bxs

# the whole API as an OpenAPI 3 document, for generators and API tools
curl -H "x-bxagents-token: $TOKEN_FOR_ADMIN" http://127.0.0.1:8080/__bxagents/openapi
```

`client.bxs` is the short tour of `AgentApiClient`. The `mock` model answers with canned text; put a real `provider/model` slug in `Agent.yaml` to talk to a real model.
