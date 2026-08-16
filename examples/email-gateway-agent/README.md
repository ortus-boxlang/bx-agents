# email-gateway-agent

An agent reachable over real email via a push-style `gateways/` entry (`type: "email"`) - a scheduled IMAP poll for inbound, an SMTP send (via ColdBox's `cbmailservices`) for outbound.

## 1. Real, server-level module installs required

Unlike every other gateway in this directory, `email` needs two extra modules actually installed on whatever server runs this project - they're already declared as `box.json` `dependencies`, but still require a real install step:

```bash
box install
```

Confirm it worked: `modules/bx-mail/` and `modules/cbmailservices/` should exist afterward.

## 2. Mailbox credentials

Any real IMAP+SMTP mailbox works. For Gmail specifically, use an [app password](https://myaccount.google.com/apppasswords) (2FA must be on) rather than your real account password - IMAP access with a plain password is disabled by default.

## 3. Configure and run

```bash
export IMAP_HOST="imap.gmail.com"
export IMAP_USERNAME="you@gmail.com"
export IMAP_PASSWORD="your-app-password"
export EMAIL_FROM_ADDRESS="you@gmail.com"
bxAgents build
bxAgents serve
```

`EmailGateway` polls IMAP for unseen mail every 60 seconds (configurable via `pollIntervalSeconds`). Send the mailbox an email - the reply comes back threaded via `In-Reply-To`/`References`.

{% hint style="warning" %}
Human-in-the-loop is **degraded** here - there's no button/component surface in email, so approval requests arrive as plain text asking you to reply with a decision keyword, correlated via a `[bxagents:<requestID>]` tag in the Subject line rather than `In-Reply-To`. See [Email - server-level dependencies, and degraded threading/HITL](../../docs/conventions/gateways.md#email---server-level-dependencies-and-degraded-threadinghitl).
{% endhint %}

See [Known Limitations](../../docs/known-limitations.md) for exactly what was and wasn't verified against real `jakarta.mail`/`cbmailservices` infrastructure - this is the least-verified of the push-style gateways in this repo.
