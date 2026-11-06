---
title: "Lesson 8: Talking to Your Agent"
icon: phosphor-duotone:chat-circle-text
summary: chat, invoke and serve - three ways to run the exact same built agent.
description: chat, invoke and serve - three ways to run the exact same built agent.
tags: [course, cli]
---

# Talking to Your Agent

Once you've built your project ([Lesson 7](07-building-your-agent.md)), there are
three ways to run it - all load the exact same `GeneratedAgentFactory.bx` and build
the exact same agent tree, so they never diverge from each other.

## `chat` - a full-screen terminal chat

```bash
bxAgents chat                                  # fast, in-process
bxAgents chat --server [--port=<port>]         # full app, own throwaway server
bxAgents chat --connect=http://127.0.0.1:8080  # full app, server you already run
bxAgents chat --connect=https://agent.example.com --token=<token>   # a server that wants a token
```

At a terminal this draws a full-screen chat, not a bare prompt (the tour is in
[The terminal UI](../guides/terminal-ui.md)). Finished turns are ordinary terminal text, so
your scrollback and search keep working. Answers stream in as formatted Markdown, tool calls
show their arguments and how long they took, and a run that needs approval asks in place.
Add `--no-tui`, or run without a terminal, for the plain line-by-line prompt.

What you can do in it:

- **Keys.** Enter sends, Alt+Enter adds a line, Up and Down walk your history, Esc stops the
  agent, and a message typed while it works steers it. `?` or `/keys` lists every key, and you
  can rebind them in `~/.bxagents/bxAgents.yml`.
- **Slash commands.** Type `/` for a menu: `/help`, `/tools`, `/model`, `/info` and more. Every
  command is listed in [Slash commands](../guides/slash-commands.md).
- **Sessions.** Every chat is a conversation kept in `data/chat.db`, the same list the web chat
  shows. `/sessions` lists them, `/resume` goes back to one, `/new` starts another, `/name` names
  it, `/fork` copies it and carries on in the copy, and `/export` saves it as Markdown or HTML.
  `bxAgents chat --continue` reopens the latest one. The messages themselves last as long as the
  agent's memory does, so use a `file` memory if you want them after a restart.
- **Notes.** With a `notes:` block in `Agent.yaml`, `/remember <text>` and `/notes` keep short
  notes about you that the agent reads at the start of each conversation.
- **Context.** The hint row under the box shows how much of the model's window is used, such as
  `ctx ~12.4k / 128k 9%`. `/context` shows what it is made of.
- **Files and pictures.** `@` lists files, and `@notes.md` puts a text file's content in your
  message. `@picture.png` or Ctrl+V sends a picture (refused when the profile says `vision: false`).
- **Recording.** `bxAgents chat --record=demo.cast`, or `/record` inside the chat, saves the screen
  as an asciicast file for demos.

The default mode loads the generated factory directly in this process - fastest, but
without anything ColdBox brings (no scheduler, no interceptors, no
gateway registry). When that matters, `--server` boots a real miniserver and drives the
chat over HTTP against your project's agent API, and `--connect` does the
same against a server you already have running. Both HTTP modes **stream** the reply
token by token and carry the conversation across turns. If the server keeps its API
somewhere else (`agentApi.path`), add `--api-path=/where`. If it wants a token
([Lesson 13](13-exposing-http-and-mcp.md)), pass `--token=<token>` or set `BXAGENTS_TOKEN`.

## `invoke` - one non-interactive turn

```bash
bxAgents invoke --message="What's the weather in Boston?" [--json]
```

Exists for scripting and CI, where `chat`'s TTY requirement is a hard blocker. By
default this loads the generated factory in-process, the same path `chat` uses
internally, just without the chat screen - no `serve` prerequisite at all. `--json`
prints `{"response": "..."}` instead of plain text.

Add `--server` to instead launch a real, throwaway `boxlang-miniserver` process and
send the message as a genuine HTTP request to your project's agent API -
no `gateways/` entry needed (those come in [Lesson 13](13-exposing-http-and-mcp.md)). Like
`serve`, it needs `boxlang-miniserver` on `PATH`.

## `serve` - a real HTTP server

```bash
bxAgents serve --port=8080
```

Requires a prior `build` and requires `boxlang-miniserver` on `PATH` (see
[Lesson 3](03-installing-bxagents.md)). Launches a real server process pointed at
`.build/app`, scoped to its own `.build/runtime` BoxLang home so each project's
compiled-class cache stays isolated.

## Testing without a real API key

Every one of these needs a real model to talk to a real provider - but you don't need
one yet. (`bxAgents models test` later sends each model one tiny question, so a wrong key or
model name shows before a chat does.) Add a `test` environment override to `Agent.yaml` (covered fully in
[Lesson 19](19-testing-your-agent.md)):

```yaml
environments:
  test:
    model: mock/mock-model
```

then `bxAgents build --environment=test && bxAgents chat` runs entirely against bx-ai's
built-in mock provider - no network call, no API key.

## Try it

```bash
export OPENAI_API_KEY=sk-...   # or use the mock override above
bxAgents chat
```

Say hello to the agent you scaffolded and wrote instructions for in
[Lessons 4-6](04-scaffolding-your-first-agent.md). It's a real, running agent - you
just haven't given it anything to *do* yet. That starts next lesson.

Full reference: [Quick Start](../getting-started/quick-start.md), [CLI Reference](../cli-reference.md).

Next: [Lesson 9 - Giving Your Agent Tools](09-giving-your-agent-tools.md)
