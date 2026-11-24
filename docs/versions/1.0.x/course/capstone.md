---
title: "Ship Acme Support"
icon: phosphor-duotone:flag-checkered
summary: Prove the whole agent works as one, swap in a real model with two lines, and see where to go next.
description: Prove the whole agent works as one, swap in a real model with two lines, and see where to go next.
tags: [course, deployment]
---

# Ship Acme Support

You started with a model that says only what a script tells it to, and an empty folder. This lesson checks what you
built as one thing, shows the two lines that swap the scripted model for a real one, and points at what to read next.

!!! info "What you will do"
    Run a checklist that exercises Acme support from the build to the backup, then read how to put a real model behind
    it. About 20 minutes.

## What "done" means for an agent project

An agent is done when someone who has never seen it can answer yes to each of these without asking you:

- It **builds**, and `doctor` finds nothing to fix.
- It **answers**: the persona, a tool, a skill, a subagent, and the model of the right profile.
- It **remembers** what it should (notes) and **keeps secrets** where it should (the vault).
- It **runs by itself** where it should (a routine), and **stops to ask** where it should (approvals).
- It is **tested** with a mocked model, so the suite needs no key.
- It **packages**, and its state can be **backed up**.

## 1. A checklist you can run

This script runs each of those checks against the project and prints one line each. It is a few lines of shell, not a
framework, so read it before you run it; it changes nothing but the `dist/` folder and one backup:

```bash title="check.sh"
#!/usr/bin/env bash
# Checks the whole of Acme support, one line per check.
cd "$(dirname "$0")/acme-support" || exit 1
fails=0
total=0
check() { # name, command, text the output must contain
	total=$((total + 1))
	if out=$(eval "$2" 2>&1) && grep -qF -- "$3" <<<"$out"; then
		echo "ok    $1"
	else
		echo "FAIL  $1"
		fails=$((fails + 1))
	fi
}

check "builds"                 "bxAgents build"                          "Build succeeded"
check "doctor finds no problem" "bxAgents doctor | grep -E 'Everything checks out|^0 problem'" ""
check "the order tool is there" "bxAgents invoke --message=capabilities" "orderStatus"
check "the subagents are there" "bxAgents invoke --message=capabilities" "delegate_to_writer"
check "the refund skill is there" "bxAgents invoke --message=system"      "refund-policy"
check "the profiles are there" "bxAgents models list"                    "planner"
check "it answers a refund"    "bxAgents invoke --message=refund"        "30 days"
check "it looks up an order"   "bxAgents invoke --message=48213"         "shipped"
check "it uses the vault"      "bxAgents invoke --message=vault"         "set:true"
check "it keeps a shared note" "bxAgents notes list --scope=agent"       "Orders-ship-from-Leeds"
check "it has its routine"     "bxAgents routines list"                  "weekly-report"
if [ -d lib/testbox ]; then
	check "its tests pass"     "bxAgents test"                           "Fail: 0 | Error: 0"
else
	echo "skip  its tests pass (run box install first)"
fi
check "it packages"            "bxAgents package --version=1.0.0"        "Packaged"
check "its data can be backed up" "bxAgents backup"                      "Backed up"

echo
if [ "$fails" -eq 0 ]; then echo "All $total checks passed."; else echo "$fails of $total checks FAILED."; exit 1; fi
```

```bash title="Terminal 2"
cd ~/bxagents-course
bash check.sh
```

```text title="You see"
ok    builds
ok    doctor finds no problem
ok    the order tool is there
ok    the subagents are there
ok    the refund skill is there
ok    the profiles are there
ok    it answers a refund
ok    it looks up an order
ok    it uses the vault
ok    it keeps a shared note
ok    it has its routine
<anything>its tests pass<anything>
ok    it packages
ok    its data can be backed up

All <anything> checks passed.
```

A check that fails prints `FAIL` and its name, which says which lesson to go back to. `kit/resume.sh <lesson>` restores the
project files of that lesson, and the tokens, notes, routines and secrets of your data home are made by the lessons on
[memory](memory-and-notes.md), [routines](routines-and-reports.md), [tokens](users-roles-and-tokens.md) and the
[vault](the-vault.md).

## 2. Swap in a real model

Nothing in the agent knows it has been talking to a script. A real model is two lines of `Agent.yml` and a key:

```yaml
provider: openai
model: gpt-5
```

```bash
# .env, in the project (it is not packaged, and .gitignore keeps it out of git)
OPENAI_API_KEY=sk-...
```

Then `bxAgents build`, and `bxAgents models test` sends each model one small question to prove the key works (it spends a
few tokens; this course could not run it against the scripted model). A few things change when the model is real, and
none of them is a file:

- **Answers differ.** Every "You see" block of this course came from the script. A real model words things its own way and
  may decide not to call a tool or load a skill; write instructions that say when to.
- **Profiles point at real models.** `fast` and `planner` named the same scripted server; give each its own `provider`,
  `model` and `apiKeyEnv` (the *name* of the variable holding its key).
- **Keep the mock for tests.** `environments.test` keeps swapping in the mock model, so the suite stays free and fast and
  still proves your tools, whatever model runs in production.
- **Secrets stay where they were.** Provider keys are environment variables; secrets that people give the running agent
  are in the vault; passwords are never in a file.

## 3. Where next

::: cards
::: card title="Examples" icon="phosphor-duotone:folder-open" href="https://github.com/ortus-boxlang/bx-agents/tree/development/examples"
One-feature projects: a multi-agent team, a scheduled agent, a Slack bot, a web chat agent.
:::
::: card title="Your first extension" icon="phosphor-duotone:puzzle-piece" href="../guides/first-extension.md"
Commands, keys, status items and web slots, in one file.
:::
::: card title="The CLI reference" icon="phosphor-duotone:terminal-window" href="../cli-reference.md"
Every verb and flag, with what each does.
:::
::: card title="Conventions" icon="phosphor-duotone:cube" href="../conventions/agent-yaml.md"
The full reference for every folder and setting you used.
:::
:::

You went from an empty terminal to an agent that answers, uses tools and skills, delegates, remembers, runs on a
schedule, asks first, knows who is allowed, keeps secrets, can be tested, packaged and backed up. Everything from here
is applying the same conventions to whatever you want to build.

Congratulations, and welcome to BxAgents.

## Checkpoint

`kit/resume.sh capstone` restores the whole project as this course leaves it, ready to rebuild.
