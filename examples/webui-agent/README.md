# webui-agent

An agent reachable through BxAgents' v1 web chat UI - a small, dependency-free static chat page, generated for free from a `gateways/*` entry with `exposes: "webui"`.

```bash
bxAgents build
bxAgents serve --port=8080
```

Open **http://localhost:8080/chat/index.html** in a browser and start chatting - replies stream in token-by-token via the agent API's `/__bxagents/stream` SSE route.

The header has **Chats**, the context ring and a **Settings** gear. The gear opens a menu with three groups: **Conversation** (fork, export, clear, compact), **You** (notes, appearance, theme) and **Server** (password, access tokens). `gateways/chat.bx` can also set `suggestions` (up to four buttons on an empty conversation) and an `icon` written as `phosphor:<name>`.

## How it's wired

- `path: "/chat"` is where the static shell is served (`/chat/index.html`, a real file - no ColdBox route needed for it). The page itself calls the agent API at `/__bxagents`, the same one the terminal chat and the gateways use, which derives the visitor's identity server-side only rather than trusting a caller-supplied `userId` the way `toAi()` does - see [Conversation identity](../../docs/conventions/web-ui.md#conversation-identity).
- `apiKeyEnvVar` is **optional** - it is the agent API's shared secret, not a full login system. This example ships it **set** (`CHAT_UI_API_KEY`), so every call to `/__bxagents` requires a matching `x-bxagents-token` header - the shell itself (`/chat/index.html`) stays reachable regardless, since a browser's plain page navigation can't send a custom header, and the shell is exactly what prompts you for the token in the first place. Delete the `apiKeyEnvVar` line entirely to leave the UI open instead (fine for local dev, not for a public deployment).

```bash
export CHAT_UI_API_KEY="a-real-secret"
bxAgents build
bxAgents serve --port=8080
```

`/chat/index.html` loads fine either way, but a call without the matching key gets a 401 and the page opens its **Password** form by itself. Type `a-real-secret` and choose **Save**; the browser keeps it in `localStorage` until you choose **Forget it**. The form is also under the **Settings** gear, then **Password**.

{% hint style="info" %}
The page is a full chat client: a conversation sidebar backed by a real SQLite store, streaming with reasoning and tool-call disclosures, human-in-the-loop approvals, steer-while-streaming, compaction, and server-side theming. It is still plain vanilla HTML/CSS/JS with no Bootstrap/AlpineJS and no build step - that constraint is about the build (a generated project never needs Node or npm), not about scope. See [The web chat UI](../../docs/conventions/web-ui.md) for the full picture, its [What is not here yet](../../docs/conventions/web-ui.md#what-is-not-here-yet) section for the real gaps.
{% endhint %}
