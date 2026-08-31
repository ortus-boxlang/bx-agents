---
title: "gateways/ - GitHub"
icon: phosphor-duotone:plugs-connected
summary: "Webhook-driven push-style gateway - @mention-gated issue/PR comment threads."
description: "Webhook-driven push-style gateway - @mention-gated issue/PR comment threads."
tags: [conventions, gateways, github]
---

# GitHub

Part of the push-style [gateways/](index.md) family - see there for the shared "secrets stay external" rule, `GatewaySession`, and the scheduler these gateways run under. This page covers GitHub's own config shape and (where BxAgents does anything platform-specific) how it talks to GitHub.

```javascript
// gateways/githubChannel.bx
class {
	function configure() {
		return {
			type               : "github",
			tokenEnvVar        : "GITHUB_TOKEN",           // a personal access token (repo/issues+PR read+write scope)
			webhookSecretEnvVar: "GITHUB_WEBHOOK_SECRET",  // HMAC key verifying X-Hub-Signature-256 on inbound webhooks
			botNameEnvVar      : "GITHUB_BOT_NAME"         // the bot's own GitHub login - matched as "@botName" in comments
			// apiBaseUrl: "https://api.github.com"   // optional override - defaults to "https://api.github.com"
		};
	}
}
```

**Validation:** `type: "github"` requires `tokenEnvVar`, `webhookSecretEnvVar`, and `botNameEnvVar`. Checked the same way a channel-adapter `http` entry's `secretEnvVar` is.

Generated registration statement:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.GitHubGateway", { "token" : getSystemSetting( "GITHUB_TOKEN", "" ), "webhookSecret" : getSystemSetting( "GITHUB_WEBHOOK_SECRET", "" ), "botName" : getSystemSetting( "GITHUB_BOT_NAME", "" ) } ) )
```

## GitHub - `@mention`-gated issue/PR comment threads

`GitHubGateway` treats each issue, PR, or inline review-comment thread as a chat conversation - the agent responds when explicitly `@mentioned` in a comment, and replies by posting a new comment back to the same thread. Webhook-driven the same way every other gateway in this section is:

```javascript
post( "/webhooks/github" ).toHandler( "GitHub.process" )
```

Ported from Vercel Eve's real GitHub channel (`packages/eve/src/public/channels/github/`, MIT licensed) - `X-Hub-Signature-256` verification is confirmed the **identical construction** to WhatsApp Cloud's own Meta scheme (HMAC-SHA256 over the raw body, hex, `sha256=` prefix) - the only webhook gateway in this project that reuses another one's exact signature algorithm, rather than needing its own. Only `issue_comment` and `pull_request_review_comment` events with `action: "created"` get dispatched (matching Eve's own only-default-handled event kinds - `issues`/`pull_request`/`check_suite`/`check_run`/`workflow_run` have no default dispatch in Eve either, and aren't wired here); every other event kind is acknowledged (200) but ignored, to avoid GitHub's retry/disable-hook-on-failure behavior for events this gateway doesn't act on.

**The dispatch gate is a genuine `@mention` requirement**, ported from Eve's own `extractGitHubCommentTrigger()`: a comment only reaches the agent if it contains `@<botName>` followed by end-of-string or a non-identifier character (so a bot named `mybot` never fires on a comment mentioning `@mybot2`) - confirmed via a real regex-lookahead smoke test this session before trusting it. The matched `@mention` token is stripped from the text before it reaches the agent. Bot-loop prevention mirrors Eve's own three-part guard: any comment whose author has GitHub's own `type: "Bot"`, whose login matches `{botName}[bot]`, or whose body contains this gateway's own `<!-- bxagents:posted -->` marker (appended to every comment it posts) is ignored outright, even if it happens to contain a mention.

A "conversation" is identified by one of two shapes, matching Eve's own model: `repo:{owner}/{repo}:issue:{issueNumber}` for an ordinary issue/PR comment thread, or `repo:{owner}/{repo}:review-comment:{reviewThreadRootCommentId}` for an inline PR review-comment thread - replies to a review thread always go to the **thread root** comment (`comment.in_reply_to_id ?? comment.id`), not the specific comment being replied to, so a multi-message back-and-forth stays one thread. Outbound replies POST to `repos/{owner}/{repo}/issues/{issueNumber}/comments` (ordinary threads) or `repos/{owner}/{repo}/pulls/{pullRequestNumber}/comments/{reviewCommentId}/replies` (review threads).

!!! info
    v1 auth is a plain personal access token (`tokenEnvVar`), not Eve's own GitHub App JWT + installation-token flow - simpler and more directly portable for a first cut (Eve itself supports a pre-resolved-token bypass for exactly this reason, which is what this maps onto). A future GitHub App mode is a natural extension, not built here. Unlike Eve (which has no delivery-id dedup at all, confirmed absent by reading its source), `GitHubGateway` dedups by `X-GitHub-Delivery` via a bounded FIFO cache, matching WhatsApp Cloud's own `wamid` dedup discipline.

!!! warning
    No repo checkout/code-editing (Eve's own `checkout.ts`, which clones the repo into a sandbox so the agent can read/edit code) was ported - this is a comment-in/comment-out chat surface only. Human-in-the-loop is degraded the same way Twilio's is (no native button/card affordance) - `requestHumanInteraction()` posts a comment asking the human to `@mention` the bot again in a reply with one of the allowed decisions, correlated by conversationID (not a per-request tag), the same v1 simplification Twilio's own HITL fallback uses.
