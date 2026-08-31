---
title: "Lesson 9: Giving Your Agent Tools"
icon: phosphor-duotone:wrench
summary: Any @AITool-annotated function under tools/ becomes a callable tool.
description: Any @AITool-annotated function under tools/ becomes a callable tool.
tags: [course, conventions, tools]
---

# Giving Your Agent Tools

Any `.bx` file under `tools/` (searched recursively, so `tools/nested/Search.bx` works
too) that declares an `@AITool`-annotated function becomes a callable tool for your
agent.

```javascript
// tools/Greeter.bx
class {

	@AITool( "Say hello to someone by name." )
	function sayHello( name ) {
		return "Hello, " & arguments.name & "!";
	}

}
```

BxAgents doesn't scan or interpret `@AITool` annotations itself at build time - it
just discovers one entry per `.bx` file (for name-collision checking) and copies the
whole `tools/` folder **verbatim** into the generated app. At startup, the generated
app calls bx-ai's own scanner (`aiToolRegistry().scan( "tools" )`), which does the real
reflection work. This statement is only emitted at all if your project actually has a
`tools/` folder with files in it.

## Naming

The discovered entry name is the file's own base name - `Greeter.bx` becomes
`Greeter`. Two tool files with the same base name, even in different subfolders (since
discovery is flat by base name), fail validation with a duplicate-name error.

## What's excluded

Dotfiles are ignored by discovery, and `.env`/dotfiles inside `tools/` are never
copied into the build output even if present.

## Rebuilds are clean

`tools/` is copied with a wipe-then-write strategy on every `build` - a file you
delete from your project's `tools/` folder never lingers as stale output from a
previous build.

## Try it

Add a real tool to the agent you've been building:

```javascript
// tools/GetTime.bx
class {

	@AITool( "Get the current server time." )
	function now() {
		return dateTimeFormat( now(), "yyyy-mm-dd HH:nn:ss" );
	}

}
```

Rebuild and chat with it:

```bash
bxAgents build
bxAgents chat
> What time is it?
```

Full reference: [tools/](../conventions/tools.md).

Next: [Lesson 10 - Packaging Skills](10-packaging-skills.md)
