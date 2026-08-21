---
title: modules/
icon: phosphor-duotone:puzzle-piece
summary: BoxLang module dependencies, one immediate subfolder per module.
description: BoxLang module dependencies, one immediate subfolder per module.
tags: [conventions, modules]
---

# modules/

`modules/` holds BoxLang module dependencies your agent needs - one immediate subfolder per module, discovered by folder name (not recursive - only the top level of `modules/` is enumerated).

```
modules/
└── my-extra-module/
    ├── module.json
    └── ...
```

## Declaring dependencies between modules

A module folder may include a `module.json` with a `dependsOn` array naming other `modules/*` entries by folder name:

```json
{
	"dependsOn": [ "some-other-module" ]
}
```

This is BX Agents' own dependency-declaration convention for validation purposes - it is independent of BoxLang's own module-loading mechanism.

## Validation

- A `module.json` that isn't valid JSON fails the build with a parse error naming the offending module.
- A `dependsOn` entry naming a module that isn't itself a discovered `modules/*` folder fails validation ("depends on unknown module").
- **Circular dependencies** are rejected the same way [subagent](subagents.md) cycles are - full cycle path reported, DFS-based detection, no code generation happens until the graph is acyclic.
- A `module.json` is entirely optional - a module folder with none is assumed to have no declared dependencies.