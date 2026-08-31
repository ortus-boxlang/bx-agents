---
title: "gateways/ - Email"
icon: phosphor-duotone:plugs-connected
summary: "Long-poll IMAP inbound, cbmailservices/bx-mail outbound - degraded threading and HITL."
description: "Long-poll IMAP inbound, cbmailservices/bx-mail outbound - degraded threading and HITL."
tags: [conventions, gateways, email]
---

# Email

Part of the push-style [gateways/](index.md) family - see there for the shared "secrets stay external" rule, `GatewaySession`, and the scheduler these gateways run under. This page covers Email's own config shape and (where BxAgents does anything platform-specific) how it talks to Email.

```javascript
// gateways/emailChannel.bx
class {
	function configure() {
		return {
			type              : "email",
			imapHostEnvVar    : "IMAP_HOST",
			imapUsernameEnvVar: "IMAP_USERNAME",
			imapPasswordEnvVar: "IMAP_PASSWORD",
			fromAddressEnvVar : "EMAIL_FROM_ADDRESS"
			// imapPort: 993   // optional override - defaults to 993 (IMAPS)
			// pollIntervalSeconds: 60   // optional override - defaults to 60
		};
	}
}
```

**Validation:** `type: "email"` requires `imapHostEnvVar`, `imapUsernameEnvVar`, `imapPasswordEnvVar`, and `fromAddressEnvVar`. Checked the same way a channel-adapter `http` entry's `secretEnvVar` is.

Generated registration statement:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.EmailGateway", { "imapHost" : getSystemSetting( "IMAP_HOST", "" ), "imapUsername" : getSystemSetting( "IMAP_USERNAME", "" ), "imapPassword" : getSystemSetting( "IMAP_PASSWORD", "" ), "fromAddress" : getSystemSetting( "EMAIL_FROM_ADDRESS", "" ) } ) )
```

## Email - server-level dependencies, and degraded threading/HITL

`EmailGateway` is the only push-style gateway that doesn't speak its platform's API directly. Outbound mail goes through ColdBox's own [`cbmailservices`](https://coldbox.ortusbooks.com/the-basics/modules/core-modules) module (`MailService@cbmailservices`, its `BXMail` protocol - which itself just calls BoxLang's own `bx:mail` component, from the `bx-mail` module) rather than a hand-rolled HTTP/SMTP call. **Both are real, server-level module installs** - they're declared as this project's own `box.json` `dependencies` (so installing `bx-agents` pulls them onto the server too), but cbmailservices/bx-mail both still require an explicit install on whatever server actually runs a generated app (confirmed against both modules' own docs/source - neither ships pre-installed with ColdBox or BoxLang) - do a real `box install` (or equivalent) before `bxAgents serve`/deploying a project with an `email` gateway. `EmailGateway` resolves `MailService@cbmailservices` manually off `application.cbController.getWireBox()` (see `ScheduledGatewayBase.resolveScheduler()`'s own docblock for why - this class is constructed directly by `aiGateway()`, entirely outside WireBox, so `inject=""` is never honored on it), the same way the scheduler itself is resolved.

Because neither `bx-mail` nor `cbmailservices` receive mail (only send it), inbound is hand-rolled IMAP via the JDK-standard `jakarta.mail` API - confirmed reachable on this project's own classpath transitively (`bx-mail` depends on `commons-email2-jakarta`, which itself depends on `jakarta.mail-api` + an Angus Mail implementation), verified empirically this session against the real jars, not assumed. A scheduled task (`email-poll-<name>`) polls IMAP for unseen mail, same shape as Telegram's long-poll.

Threading and human-in-the-loop are both **degraded** relative to the chat-platform gateways, and `getDeclaredCapabilities()` deliberately omits `"interactiveActions"` to say so honestly:

- **Threading** uses real `Message-ID`/`In-Reply-To`/`References` headers for an ORDINARY reply (the gateway always knows the inbound `Message-ID` it's replying to, so setting `In-Reply-To` on the outbound reply is reliable) - a v1 simplification threads on `References`' first entry (else `In-Reply-To`, else the message's own `Message-ID`), not a full walk of the chain.
- **Human-in-the-loop has no native button/component surface at all** - `requestHumanInteraction()` sends a plain-text email listing the allowed decision keywords and asks the human to reply with one as the first line. Correlating that reply back to the right pending request can't rely on `In-Reply-To` the way ordinary replies do (cbmailservices' `send()` doesn't expose what `Message-ID` the outbound approval email itself got assigned), so it's done via a `[bxagents:<requestID>]` tag embedded in the Subject line instead - the same technique real email-based support-ticket systems use for the identical reason. A reply's first line is matched against the request's own allowed decisions (exact or prefix, case-insensitive); an unrecognized reply is passed through verbatim rather than re-prompted, left for bx-ai's own HITL coordinator to reject.
