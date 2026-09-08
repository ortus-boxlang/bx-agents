---
title: "Example: Building a Web Chat Agent"
icon: phosphor-duotone:chat-circle-dots
summary: Generate a full, branded browser chat page for an agent - no frontend code, no Node, no build step.
description: Generate a full, branded browser chat page for an agent - no frontend code, no Node, no build step.
tags: [guides, examples, web-ui]
---

# Example: Building a Web Chat Agent

[`examples/webui-agent/`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples/webui-agent) generates a complete, themed browser chat page for an agent from a single `gateways/*` entry with `exposes: "webui"` - the [v1 web chat UI](../conventions/web-ui.md). No frontend code to write, no Node/npm in the build, no separate deploy step for a SPA - the page is a real file BxAgents writes into the generated app.

This is the one example in this guide series with real screenshots, because it's the one kind of BxAgents example whose output is actually a browser page - the images below are the real generator output for this exact project, rendered and captured directly (not a mockup), so what you see is what `bxAgents build && serve` actually produces.

## The project

```
webui-agent/
├── Agent.bx
├── instructions.md
└── gateways/
    └── chat.bx
```

`Agent.bx` is the same shape as every other example:

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "webui-agent",
			description : "An agent reachable through the v1 web chat UI via gateways/.",
			model       : aiModel( provider: "mock", params: { model: "mock-model" } )
		)
		return this
	}

}
```

## The gateway: branding and theme, all in config

`gateways/chat.bx` is where the actual page comes from - `exposes: "webui"` is the trigger, and everything else is optional branding:

```javascript
class {

	function configure() {
		return {
			exposes     : "webui",
			path        : "/chat",
			apiKeyEnvVar: "CHAT_UI_API_KEY",   // optional - omit entirely to leave the UI's /chat/api/* route open (dev-mode)

			// ---------------------------------------------------------------
			// Branding
			// ---------------------------------------------------------------
			title      : "Acme Support",
			subtitle   : "Orders, returns and shipping",
			icon       : "🛟",                 // an emoji, or an image URL/path ("/logo.svg", "https://...")
			welcome    : "Hi! Ask me about an order, a return, or shipping times.",
			placeholder: "Ask about your order...",
			footer     : "Answers are generated and may be wrong - check anything important.",

			// ---------------------------------------------------------------
			// Stream detail - both default to true
			// ---------------------------------------------------------------
			showReasoning: true,   // the model's thinking, as a collapsed "Thinking" strip
			showToolCalls: true,   // each tool call as a collapsed chip (name + arguments)

			// ---------------------------------------------------------------
			// Theme - every key maps to a CSS custom property on the page.
			// ---------------------------------------------------------------
			theme: {
				accent  : "0f766e",
				accentFg: "ffffff",
				radius  : "10px",
				font    : "Inter, system-ui, sans-serif",
				maxWidth: "68%",

				dark: {
					accent  : "2dd4bf",
					accentFg: "05201c"
				}
			}
		};
	}

}
```

Colors are written as bare hex with no leading `#` (`"0f766e"`, not `"#0f766e"`) - BoxLang starts string interpolation at a hash in both single- and double-quoted strings, so a literal one has to be doubled to parse at all. Bare hex sidesteps that entirely; see the comment in the file itself for the full reasoning, and [The web chat UI](../conventions/web-ui.md) for anything the theme tokens don't cover (that goes in `resources/webui/theme.css`, inlined last and wins).

## Build and run

```bash
cd examples/webui-agent
bxAgents build
bxAgents serve --port=8080
```

Open **http://localhost:8080/chat/index.html**. This is the actual generated page for this project's own `chat.bx` config above - conversation sidebar on the left, streaming transcript in the middle, themed header and composer:

![The generated web chat UI: a conversation sidebar, a multi-turn transcript, and a themed header/composer](../assets/webui-chat-light.png)

### Dark mode

The `theme.dark` overrides (`accent`/`accentFg`) apply automatically when the page's own theme toggle switches to dark - everything else is the same generated CSS, just re-tokened:

![The same page and conversation with the Theme toggle switched to dark - theme.dark's accent/accentFg tokens carry over, everything else is the same generated CSS](../assets/webui-chat-dark.png)

### Narrow screens

The page is responsive with no separate mobile build - at a narrow viewport, the transcript keeps its full width and the conversation sidebar becomes an overlay instead of squeezing the content:

![The same page at a narrow viewport - the transcript keeps the full width, the sidebar overlays instead of squeezing it](../assets/webui-chat-mobile.png)

## The optional API key gate

This example ships `apiKeyEnvVar` **set**, so `/chat/api/*` requires a matching `X-API-Key` header - the static shell (`/chat/index.html`) itself stays reachable regardless, since a browser's plain page navigation can't send a custom header, and the shell is exactly what prompts you for the key:

```bash
export CHAT_UI_API_KEY="a-real-secret"
bxAgents build
bxAgents serve --port=8080
```

The page loads fine either way, but sending a message without first setting the matching key via the page's **Key** button gets a 401 - click **Key**, paste `a-real-secret`, and it works for the rest of the browser session (stored in `localStorage`). Delete the `apiKeyEnvVar` line entirely to leave the UI open instead (fine for local dev, never for a public deployment).

## Why not just `toAi()`?

`path: "/chat"` controls both where the static shell is served and where its own dedicated API lives (`/chat/api`, backed by a generated `handlers/ChatUi.bx`) - it reuses `toAi()`'s exact route shape and wire format for `invoke`/`stream`/`batch`, but derives the visitor's identity **server-side only**, rather than trusting a caller-supplied `userId` the way `toAi()` does. That distinction matters specifically because a browser page sits behind one shared API key with no per-user login - see [Why not `toAi()` for the webui?](../conventions/web-ui.md) for the full reasoning.

## What's proven, and what isn't

The generator output itself - the static shell, the templated placeholders, the optional auth interceptor, its registration into `config/ColdBox.bx` - is proven by real generator specs and confirmed to compile and instantiate. Over real HTTP, `runColdBoxIntegrationTests.bxs` proves `/chat/api/health` and, further, the shared-preferences round trip (`/chat/api/preferences/set` + `/chat/api/preferences`) between two independent callers - see [Known Limitations](../known-limitations.md) for exactly what is and isn't yet covered that way (conversation history and SSE streaming aren't, as of this writing). The screenshots above were captured from the real generated template and this project's real config, not a hand-built mockup - but do at least one real `bxAgents serve` + browser check of your own theme/branding choices before depending on them in production, the same standing advice the limitations page gives for every generated route.

## Where to go next

- [The web chat UI](../conventions/web-ui.md) for the full picture - human-in-the-loop approvals, compaction, steer-while-streaming, the SQLite-backed conversation store.
- [Example: A Minimal Agent](example-minimal-agent.md) if you haven't seen the base project shape yet.
- [Example: Building a Slack Bot](example-slack-bot.md) for an agent reachable on a chat platform instead of a browser.
