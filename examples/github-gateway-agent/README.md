# github-gateway-agent

An agent reachable via `@mentions` on GitHub issue/PR comments via a push-style `gateways/` entry (`type: "github"`) - webhook-driven like WhatsApp Cloud/Teams/Twilio, generating a single `POST /webhooks/github` route. Each issue/PR (or inline review-comment thread) is treated as its own chat conversation.

## 1. Get a token and pick a bot name

- A **personal access token** with repo/issues/PR read+write scope → `GITHUB_TOKEN`
- The GitHub username the bot posts as (used to match `@mentions` in comments) → `GITHUB_BOT_NAME`
- Any secret string of your own, used to configure the repo webhook below → `GITHUB_WEBHOOK_SECRET`

## 2. Configure, build, and register the webhook

```bash
export GITHUB_TOKEN="ghp_..."
export GITHUB_WEBHOOK_SECRET="a-random-secret"
export GITHUB_BOT_NAME="my-bot-account"
bxAgents build
bxAgents serve --port=8080
```

On a test repository, under **Settings → Webhooks → Add webhook**, set the Payload URL to your public `POST /webhooks/github` URL (tunnel it with `ngrok http 8080` for local dev), content type `application/json`, the same secret as `GITHUB_WEBHOOK_SECRET`, and subscribe to **Issue comments** and **Pull request review comments**.

## 3. Simulate an inbound comment locally

```bash
BODY='{"action":"created","issue":{"number":1},"comment":{"id":1,"body":"@my-bot-account can you help?","user":{"login":"someuser","type":"User"}},"repository":{"name":"test-repo","owner":{"login":"someorg"}}}'
SIG="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$GITHUB_WEBHOOK_SECRET" | sed 's/^.* //')"

curl -X POST http://localhost:8080/webhooks/github \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: $SIG" \
  -H "X-GitHub-Event: issue_comment" \
  -H "X-GitHub-Delivery: $(uuidgen)" \
  -d "$BODY"
```

Only a comment that actually contains `@my-bot-account` (as its own token, not part of another mention) reaches the agent - everything else is acknowledged and ignored, and the gateway never replies to its own comments or another bot's.

{% hint style="info" %}
v1 auth is a plain personal access token, not a full GitHub App installation flow, and there's no repo checkout - this is a comment-in/comment-out chat surface only. See [GitHub - `@mention`-gated issue/PR comment threads](../../docs/conventions/gateways.md#github---mention-gated-issuepr-comment-threads).
{% endhint %}

See [Known Limitations](../../docs/known-limitations.md) for the real `left(body, 0)` bug caught during development and what's still unverified against a real repository.
