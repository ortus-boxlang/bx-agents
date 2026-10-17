---
title: tools/
icon: phosphor-duotone:wrench
summary: Any @AITool-annotated function under tools/ becomes a callable tool.
description: Any @AITool-annotated function under tools/ becomes a callable tool.
tags: [conventions, tools]
---

# tools/

Any `.bx` file under `tools/` (searched **recursively**, so subfolders like `tools/nested/Search.bx` work too) that declares an `@AITool`-annotated function becomes a callable tool for the agent.

```javascript
// tools/Greeter.bx
class {

	@AITool( "Say hello to someone by name." )
	function sayHello( name ) {
		return "Hello, " & arguments.name & "!";
	}

}
```

BxAgents doesn't interpret `@AITool` annotations itself. It copies the whole `tools/` folder **verbatim** into the generated app, and the generated agent factory hands each agent's own folder to bx-ai's scanner, which does the real reflection work (walking the files, instantiating each class, finding `@AITool` functions). The tools it finds go to **that agent only**: a root agent's `tools/` are not given to its subagents, and a subagent's `tools/` are not given to its parent.

## Tools from modules

Tools that modules register with bx-ai (its built-ins, `bx-playwright`, ...) are not attached to anything automatically. Name the ones an agent should have in its [`tools:`](agent-yaml.md#tools) list, as `item@module` or `*@module`.

## Naming

The discovered entry name is the file's own base name (`Greeter.bx` → `Greeter`). Two tool files with the same base name (even in different subfolders, since discovery is flat by base name) fail validation with a duplicate-name error.

## What's excluded

- Dotfiles (anything starting with `.`) are ignored by discovery.
- `.env`/dotfiles inside `tools/` are never copied into the build output, even if present - the copy step explicitly excludes them.

## Rebuilds

`tools/` is copied with a wipe-then-write strategy: the generated app's own `tools/` directory is deleted and rewritten on every `build`, so a file removed from your project's `tools/` folder doesn't linger as stale output from a previous build.