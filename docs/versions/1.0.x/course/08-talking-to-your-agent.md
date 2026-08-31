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

## `chat` - an interactive REPL

```bash
bxAgents chat
```

Uses BoxLang's own `MiniConsole` for line reading. Requires a real interactive
terminal (it shells out to `stty` for raw mode - it won't work piped or
non-interactively). Type `exit` or `quit` to leave.

## `invoke` - one non-interactive turn

```bash
bxAgents invoke --message="What's the weather in Boston?" [--json]
```

Exists for scripting and CI, where `chat`'s TTY requirement is a hard blocker. By
default this loads the generated factory in-process, the same path `chat` uses
internally, just without the REPL loop - no `serve` prerequisite at all. `--json`
prints `{"response": "..."}` instead of plain text.

Add `--server` to instead launch a real, throwaway `boxlang-miniserver` process and
send the message as a genuine HTTP request through your project's exposed route -
useful once you've added a `gateways/` entry (see [Lesson 13](13-exposing-http-and-mcp.md)).

## `serve` - a real HTTP server

```bash
bxAgents serve --port=8080
```

Requires a prior `build` and requires `boxlang-miniserver` on `PATH` (see
[Lesson 3](03-installing-bxagents.md)). Launches a real server process pointed at
`.build/app`, scoped to its own `.build/runtime` BoxLang home so each project's
compiled-class cache stays isolated.

!!! warning
    The **very first** request to a freshly booted app's `toAi()` route can
    transiently fail - a genuine ColdBox/WireBox lazy-injection race, not a BxAgents
    bug. It succeeds reliably after that. Send a warm-up request before relying on a
    freshly deployed route under load.

## Testing without a real API key

Every one of these needs a real model to talk to a real provider - but you don't need
one yet. Add a `test()` override to `Agent.bx` (covered fully in
[Lesson 19](19-testing-your-agent.md)):

```javascript
function test() {
	return { model : "mock/mock-model" };
}
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
