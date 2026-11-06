---
title: vault
icon: phosphor-duotone:vault
summary: Secrets an agent uses at run time, sealed in the chat database. The model sees names, never values.
description: Secrets an agent uses at run time, sealed in the chat database. The model sees names, never values.
tags: [conventions, secrets]
---

# The vault

An agent that connects to Gmail, a ticket system or any API needs a key or a login. The vault keeps them: **sealed in the chat database** (`data/chat.db`), added by a person from the terminal chat, the web page or the command line, and handed to a tool or an MCP server by the runtime at the moment it needs one. The model sees the **names** of secrets and what each is for. It never sees a value, and it cannot ask for one.

Environment variables stay as they are, and are still the place for provider keys such as `OPENAI_API_KEY`. The vault is for the secrets people hand to a running agent: they change, they differ per person, and they should not need a redeploy.

## Two scopes

| Scope | Belongs to | Who manages it |
|---|---|---|
| `user` | one person (their name, as the server knows them) | that person |
| `agent` | the agent, shared by everyone who talks to it | an admin |

Asking for a name finds the person's own secret first, then the agent's. A person never sees or uses another person's secret. A run with no person behind it, such as a [schedule](schedules.md), finds the agent's secrets only. On an open server on your own machine there is one user, `local`, who is also the admin.

## Adding secrets

A value is **never a flag and never typed in a chat message**: it would sit in a history, a log or a transcript.

- **Terminal chat:** `/vault` opens a screen. `a` adds (the value is typed in a box that shows bullets), `e` edits, `d` removes, `t` switches between your secrets and the agent's.
- **Web page:** *Vault* in the settings menu. The value goes in a password field, is sent once and the field is cleared.
- **Command line:** `bxAgents vault add --name=GMAIL_TOKEN` asks for the value hidden, or reads it from a pipe with `--stdin`. See [`vault`](../cli-reference.md#vault).
- **The agent asks:** with a `vault:` block, the agent has a `vault_request` tool. Calling it opens the vault screen or the web panel on that name, with the reason, and the person types the value there. See [what the agent can do](#what-the-agent-can-do).

A secret has a **name** (letters, digits and underscores), an optional **description** and an optional list of **hosts** it may be sent to (`api.example.com`, or `*.example.com` for any subdomain). A secret with hosts is refused anywhere else.

## Using a secret

**In `Agent.yaml`**, write `${vault.NAME}` wherever `${env.NAME}` works, such as an MCP server's token or headers:

```yaml
mcpServers:
  - url: https://mail.example.com/mcp
    token: ${vault.MAIL_TOKEN}
```

It is resolved when the app starts, never at build time, so the value is never in the project, the build or the package. Only the **agent's** secrets can be used here: the app starts once for everyone, so a person's own secret has no one to belong to yet. A secret that lists hosts is sent only to the host of the server's `url`. A missing secret stops the start with a message that names it and says how to add it.

**In a tool**, call `vault()` with the tool's own `arguments` and the host the value is about to go to:

```javascript
// tools/Mailer.bx
class {

	@AITool( "Reads the newest mail." )
	function inbox( string query = "" ) {
		var token = vault( "MAIL_TOKEN", arguments, "mail.example.com" )
		// call the API with it. Never return the token.
	}

}
```

Passing `arguments` carries the run, so the person's own `MAIL_TOKEN` is found before the agent's. Without it only the agent's secret is found.

## What the agent can do

Add a `vault` block to give an agent two tools and turn on scrubbing:

```yaml
vault:
  tools: true      # vault_list and vault_request (default true)
```

| Tool | Does |
|---|---|
| `vault_list` | Names, descriptions and hosts of the secrets the person can use. Never a value. |
| `vault_request` | Asks the person to add a secret, with a reason. Takes no value and stores nothing. |

There is no tool that reads, sends or changes a value. With the block on, every value in the vault is also **scrubbed from tool results** before the model sees them, so a tool that echoes a header or an error does not leak a key.

## How it is stored

Each value is sealed with AES-256-GCM. The row's scope, owner and name are part of what is authenticated, so a sealed value copied onto another row does not open. The key comes from:

1. `BXAGENTS_VAULT_KEY`, if set: 32 random bytes as base64 (`bxAgents vault key` makes one) or any passphrase.
2. Otherwise a key file, `vault.key`, made on first use beside the database and readable only by its owner.

!!! warning
    The key file sits next to the data it protects: anyone who copies the data folder gets both. Set `BXAGENTS_VAULT_KEY` where the agent runs for real protection, and keep a copy of the key somewhere safe. **If the key is lost the secrets cannot be recovered.** BxAgents never makes a new key when secrets exist and the key is missing: it stops and says so.

Every add, change, removal and use is written to an audit table (`bxAgents vault audit`) with who, what, from where and which host. It holds names, never values.

## Limits

- A static key or token only. OAuth sign-in and token refresh are not part of the vault yet.
- Secrets used in `Agent.yaml` are read when the app starts: change one and restart.
- A deployed server should have an [access token or sign-in](agent-bx.md#access-tokens-for-a-deployed-agent): on an open server anyone who can reach the page is the admin.
