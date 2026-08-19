---
title: tools/
icon: 🔧
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

BX Agents doesn't scan or interpret `@AITool` annotations itself - it discovers one entry per `.bx` file (for name-collision checking) and then copies the whole `tools/` folder **verbatim** into the generated app. At startup, the generated app calls bx-ai's own scanner:

```javascript
aiToolRegistry().scan( "tools" )
```

which does the real reflection work (walking the copied files, instantiating each class, finding `@AITool` functions). This statement is only emitted at all if the project actually has a `tools/` folder with files in it.

## Naming

The discovered entry name is the file's own base name (`Greeter.bx` → `Greeter`). Two tool files with the same base name (even in different subfolders, since discovery is flat by base name) fail validation with a duplicate-name error.

## What's excluded

- Dotfiles (anything starting with `.`) are ignored by discovery.
- `.env`/dotfiles inside `tools/` are never copied into the build output, even if present - the copy step explicitly excludes them.

## Rebuilds

`tools/` is copied with a wipe-then-write strategy: the generated app's own `tools/` directory is deleted and rewritten on every `build`, so a file removed from your project's `tools/` folder doesn't linger as stale output from a previous build.