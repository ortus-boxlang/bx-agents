---
title: "Each Person's Own Settings"
icon: phosphor-duotone:stack
summary: Let a person change the agent for themselves without touching the project, and know who wins when two files disagree.
description: Let a person change the agent for themselves without touching the project, and know who wins when two files disagree.
tags: [course, settings, layers]
---

# Each Person's Own Settings

You wrote `Agent.yml`, and somebody else installs the agent. They want it to answer in French, or to drop a tool,
or to use their own model, and they should not have to edit your files (and lose their edits on the next update).
BxAgents lets a person keep their own settings in a file of their own, layered over yours.

!!! info "What you will build"
    A personal settings file that adds an instruction and removes a tool, seen working in the agent, then taken away
    again. About 15 minutes.

## Three files called `Agent.yml`

```text
<project>/Agent.yml             the author's file (yours)
~/.bxagents/Agent.yml           the person's file, for every agent on this machine
~/.bxagents/<agent>/Agent.yml   the person's file, for one agent
```

The person's files win over the author's, so **the person who runs the agent has the last word**. In full, first match
wins:

1. the flag of one run
2. `~/.bxagents/<agent>/Agent.yml`
3. `~/.bxagents/Agent.yml`
4. the project: `environments.<env>`, then `Agent.yml`
5. the default

`<agent>` is the agent's data home, `~/.bxagents/acme-support`, the folder that holds the conversations and notes.

## How a value is combined

A person's file does not have to repeat the whole project. A plain value replaces, a mapping merges key by key, and
markers on a key say what to do with a list or a text:

| Written as | Result |
|---|---|
| a plain value, or a list | replaces |
| `key+:` with a list | appends to the list below |
| `key+:` with text | appends to the text below, after a blank line (for `instructions`) |
| `key-:` with a list | removes those entries from the list below |
| `key: ~` | removes the key |

## 1. Look before you change

Your project's agent has these tools, one of them `now`, from [Giving Your Agent Tools](09-giving-your-agent-tools.md):

```bash title="Terminal 2"
cd ~/bxagents-course/acme-support
bxAgents build
bxAgents invoke --message=capabilities
```

```text title="You see"
Build succeeded: <anything>/acme-support/.build/app
I can use these tools: <anything>now<anything>
```

## 2. Write a person's file

Imagine you are the person who installed Acme support. Make a file for this one agent, with an instruction added after
the project's and one tool taken away:

```bash title="Terminal 2"
mkdir -p ~/.bxagents/acme-support
cat > ~/.bxagents/acme-support/Agent.yml <<'EOF'
instructions+: Always answer in French.
tools-: [ now@bxai ]
EOF
bxAgents invoke --message=capabilities
bxAgents invoke --message=system | grep French
```

```text title="You see"
...
<anything>instructions (append) from <anything>/.bxagents/acme-support/Agent.yml
<anything>tools (remove) from <anything>/.bxagents/acme-support/Agent.yml
...
I can use these tools: <anything>
Always answer in French.
```

The agent started with the person's lines applied: every setting that came from a person's file is named, with the
file, so nothing is silent. The tools line the model received has lost `now`, and your project's file is untouched.
Take the personal file away and the agent is yours again:

```bash title="Terminal 2"
rm ~/.bxagents/acme-support/Agent.yml
bxAgents invoke --message=capabilities
```

```text title="You see"
I can use these tools: <anything>now<anything>
```

## From the chat

A person does not have to write the file by hand. In the terminal chat, `/settings model ollama/qwen3` writes a setting
to the agent's own file, `--global` writes it to the file for every agent, and `/settings tools+ [ now@bxai ]` adds to a
list (`/settings tools+ reset` takes that entry out of the file again). It edits only its own lines, keeps the rest of
the file, comments included, and puts the file back when the result would not be valid. `/info` lists each setting that
came from a person's file. (The web app's **Settings** page is for appearance, the model picker and the account; the
layered files are written from the chat or by hand.)

## What to remember

- **A build bakes the machine's files.** If you ship an agent, build it on a machine without your own
  `~/.bxagents/Agent.yml`, or read the lines the build prints.
- **A built app reads the files again when it starts**, over the author's settings as the build saved them, so a zip or
  a container can be adjusted on the machine that runs it. Some keys cannot change at start, because they are generated
  into the app (`agentApi`, `gatewaySession`, `routines`, `subAgents`, `data`); the app says so in its log.
- **What a person's file may not say:** `name`, `data.home` and `environments`. Secrets stay as `${env.X}` or
  `${vault.X}` placeholders, never values.
- **An unknown key is an error here too**, and a built app that finds a bad file at start refuses to start and names it.

## Checkpoint

No file of the project changed, and the personal file is gone. `acme-support/` is as the previous lesson left it.

Full reference: [Layered settings](../conventions/layered-settings.md) and [Settings of the terminal chat](../guides/terminal-ui.md#settings).

Next: [Logs, Usage and Backups](operating-it.md)
