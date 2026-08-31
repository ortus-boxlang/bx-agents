---
title: "Lesson 11: Composing Subagents"
icon: phosphor-duotone:tree-structure
summary: Nested agents, each an ordinary BxAgents project of its own, wired as callable tools.
description: Nested agents, each an ordinary BxAgents project of its own, wired as callable tools.
tags: [course, conventions, subagents]
---

# Composing Subagents

`subagents/` holds nested agents - each an ordinary BxAgents project of its own, with
its own `Agent.bx` + `instructions.md`, and optionally its own `tools/`, `skills/`,
etc.

```
my-agent/
├── Agent.bx              # subAgents: ["researcher"]
├── instructions.md
└── subagents/
    └── researcher/
        ├── Agent.bx
        └── instructions.md
```

A subagent is wired to its parent by name, declared in the parent's `Agent.bx`
`configure()` - this is the `subagents/` **folder name**:

```javascript
function configure() {
	return {
		subAgents : [ "researcher" ]
	};
}
```

At build time, bx-ai's `addSubAgent()` wraps each built subagent instance as a
callable tool on the parent automatically - there's no separate tool-wrapping step to
write yourself.

## Flat on disk, a graph in config

Every subagent - no matter how deeply another subagent's own config references it -
lives directly under the **root** project's `subagents/` folder. A subagent's own
declared `subAgents` names reference **sibling** entries in that same root-level
folder, never a folder nested under itself.

```mermaid
flowchart LR
    subgraph disk["ON DISK - always flat"]
        direction TB
        R1["subagents/A/"]
        R2["subagents/B/"]
        R3["subagents/C/"]
    end
    subgraph declared["DECLARED - each Agent.bx's own subAgents list"]
        direction TB
        GA["A"] --> GB["B"] --> GC["C"]
    end
    subgraph built["BUILT - leaf-first"]
        direction TB
        O1["1. build C"] --> O2["2. build B<br/>with the built C"] --> O3["3. build A<br/>with the built B"]
    end
    disk -.-> declared
    declared -.-> built
```

A cycle in the declared graph (`A -> B -> A`) is rejected at validation, before
anything is generated. A diamond (two parents sharing one descendant) is fine.

## Two different names, two different jobs

- The **folder name** under `subagents/` is what `subAgents: [ "..." ]` references -
  purely a build-time wiring concern.
- The subagent's own **declared `name`** (its `Agent.bx`'s `name` field) is what you
  retrieve it by at runtime - every agent in the tree is registered in
  `config/WireBox.bx` under this name, so [`schedules/Scheduler.bx`](../conventions/schedules.md)
  (or anything else WireBox-aware) reaches it with `getInstance( "TheAgentName" )`.

These two names can differ, and often will. Because `name` is now also a WireBox
binding key, it must be unique across the whole project - `build` fails validation if
two agents share one.

## Try it

Scaffold a `subagents/researcher/` folder as its own small BxAgents project (its own
`Agent.bx` + `instructions.md`), then wire it into your root `Agent.bx`'s
`configure()`. Rebuild and ask your root agent something that would naturally delegate
to the researcher subagent - it's callable exactly like any other tool.

Full reference: [subagents/](../conventions/subagents.md).

Next: [Lesson 12 - Named Model Configs](12-named-model-configs.md)
