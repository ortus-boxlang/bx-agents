# subagents/

`subagents/` holds nested agents, each an ordinary BX Agents project of its own - an `Agent.bx` + `instructions.md` (and optionally its own `tools/`, `skills/`, etc.):

```
my-agent/
├── Agent.bx              # subAgents: ["researcher"]
├── instructions.md
└── subagents/
    └── researcher/
        ├── Agent.bx
        └── instructions.md
```

A subagent is wired to its parent by name, declared in the parent's `Agent.bx`:

```javascript
// Agent.bx
function configure() {
	return {
		name      : "my-agent",
		model     : "openai/gpt-5",
		subAgents : [ "researcher" ]
	};
}
```

At build time, bx-ai's `aiAgent()` wraps each built subagent instance as a callable tool on the parent automatically - there's no separate tool-wrapping step to write yourself.

## Flat namespace, sibling references

Every subagent - no matter how deeply another subagent's own config references it - lives directly under the **root** project's `subagents/` folder. A subagent's own declared `subAgents` names reference **sibling** entries in that same root-level folder, not a folder nested under itself. This keeps the discovery/validation model simple: one flat directed graph over `subagents/`'s immediate subfolders, rather than a tree that could nest arbitrarily deep on disk.

## Build order

Subagents are built **leaf-first** (bottom-up): if `A` declares `subAgents: ["B"]` and `B` declares `subAgents: ["C"]`, the generated `GeneratedAgentFactory.bx` builds `C`, then `B` (passing in the built `C` instance), then `A` (passing in the built `B` instance) - never the other way around, since a parent's `aiAgent()` call needs its children's already-built instances.

## Validation

- A subagent name in `subAgents` that doesn't correspond to a real `subagents/{name}/Agent.bx` fails the build with a clear "referenced from ... was not found" error.
- **Circular references** (`A` → `B` → `A`) are rejected at validation time, with the full cycle path reported (e.g. `A -> B -> A`), before any code generation happens.
- A "diamond" shape - two subagents both depending on the same shared descendant - is **not** a cycle and builds fine; only genuine cycles are rejected.
- A missing `Agent.bx` inside a discovered `subagents/*` folder is reported as its own validation error.
