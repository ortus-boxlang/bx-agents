# webui-agent

An agent reachable through BX Agents' v1 web chat UI - a small, dependency-free static chat page, generated for free from a `gateways/*` entry with `exposes: "webui"`.

```bash
bxAgents build
bxAgents serve --port=8080
```

Open **http://localhost:8080/chat/index.html** in a browser and start chatting - replies stream in token-by-token via `toAi()`'s own `/stream` SSE route.

## How it's wired

- `path: "/chat"` controls both where the static shell is served (`/chat/index.html`, a real file - no ColdBox route needed for it) and where its dedicated API lives (`/chat/api`, a generated `route( "/chat/api" ).toAi( "GeneratedAgent" )`).
- `apiKeyEnvVar` is **optional** - a simple, toggleable gate, not a full login system. This example ships it **set** (`CHAT_UI_API_KEY`), so `/chat/api/*` requires a matching `X-API-Key` header - the shell itself (`/chat/index.html`) stays reachable regardless, since a browser's plain page navigation can't send a custom header, and the shell is exactly what prompts you for the key in the first place. Delete the `apiKeyEnvVar` line entirely to leave the UI open instead (fine for local dev, not for a public deployment).

```bash
export CHAT_UI_API_KEY="a-real-secret"
bxAgents build
bxAgents serve --port=8080
```

`/chat/index.html` loads fine either way, but sending a message without first setting the matching key via the page's **Key** button gets a 401 - click **Key**, paste `a-real-secret`, and it works for the rest of the browser session (stored in `localStorage`).

{% hint style="info" %}
The page is a full chat client: a conversation sidebar backed by a real SQLite store, streaming with reasoning and tool-call disclosures, human-in-the-loop approvals, steer-while-streaming, compaction, and server-side theming. It is still plain vanilla HTML/CSS/JS with no Bootstrap/AlpineJS and no build step - that constraint is about the build (a generated project never needs Node or npm), not about scope. See [The web chat UI](../../docs/conventions/web-ui.md) for the full picture, its [What is not here yet](../../docs/conventions/web-ui.md#what-is-not-here-yet) section for the real gaps, and [Known Limitations](../../docs/known-limitations.md) for what is verified vs. not.
{% endhint %}
