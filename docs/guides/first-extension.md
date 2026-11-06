---
title: "Guide: Write Your First Extension"
icon: phosphor-duotone:puzzle-piece
summary: Start an extension, try it in the chat, change it live, and share it.
description: Start an extension with bxAgents add extension, try it in the terminal chat, change it with /reload, and share it by zip, GitHub or install.
tags: [guides, extensions]
---

# Guide: Write Your First Extension

An [extension](../conventions/extensions.md) adds to the chat and the app without touching the framework: a command, a key, a status item, a tool, a web page slot. This guide takes one from nothing to something you can share. It needs a project (`bxAgents new` makes one).

## 1. Start it

```bash
bxAgents add extension standup --with=command,key --layout=file --description="Daily standup"
```

That writes `extensions/standup.bx`: one class with a `/standup` command and a key, each with a `TODO` to fill in. Leave `--with` or `--layout` out at a terminal and it asks (what to bring, and one file or a folder). If you tick a scheduler, gateway, tool, skill or web files, it makes a folder (`extensions/standup/Extension.bx` plus those files) instead.

## 2. Try it

```bash
bxAgents chat
```

Type `/extensions` to see it loaded, then `/standup`. A problem in the file shows up there with its reason, so a typo is never silent. From a shell, `bxAgents extensions` prints the same list.

## 3. Change it live

Edit the command in `extensions/standup.bx`, then type `/reload` in the same chat. The change is in, with no restart. `/reload` is for admins; in your own terminal chat you are one. A setting goes in `configure()`:

```boxlang
function configure() {
	variables.settings = { greeting : "Good morning" }
}
```

Read it in the command as `settings.greeting`. `Agent.yaml` (or your own `~/.bxagents/bxAgents.yml`) can change it without touching the code:

```yaml
extensions:
  standup:
    greeting: "Hello team"
```

## 4. Use it in every project

An extension in the project's `extensions/` belongs to that project and goes into its built app. To have one in your own terminal chat everywhere, link it:

```bash
bxAgents extensions link ./extensions/standup.bx
```

It now loads from where you edit it, in every chat on this machine, and `/reload` picks up a change.

## 5. Share it

An extension is a folder or a file, so sharing is giving someone that:

- zip the folder, or push it to a GitHub repository;
- they run `bxAgents extensions install ./standup.zip`, or `bxAgents extensions install you/standup`.

They see what it adds and what its code mentions, and say yes before anything is placed. The install is recorded in `extensions.lock.json`, which they commit; the extension itself is restored from it at build time.

## Where next

- [Extensions](../conventions/extensions.md) lists everything an extension can bring, with the exact shape of each.
- [`examples/extensions-agent`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples/extensions-agent) has a working extension of each kind.
