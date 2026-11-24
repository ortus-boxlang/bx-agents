---
title: "Giving Your Agent Tools"
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
app calls bx-ai's own scanner (`aiToolRegistry().scan( "app.tools" )`: the scanner expands the dotted path against a mapping, `/app` here, so it has to be a mapping path and not one relative to the app), which registers the tools
by name, and the agent factory loads each agent's own `tools/` folder through bx-ai, which
does the real reflection work. The scan statement is only emitted at all if your project
actually has a `tools/` folder with files in it.

## Whose tools are they?

An agent gets its own `tools/` folder and nothing else: a root agent's tools are not
given to its subagents, and the other way round. Tools that *modules* register with
bx-ai (its built-ins, `bx-playwright`, ...) are only attached when the agent asks for
them in `Agent.yml`:

```yaml
tools:
  - now@bxai
  - "*@bxplaywright"
```

See [Agent.yml](../conventions/agent-yaml.md#tools) for the details.

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

Acme support should know where an order is. First, see what the agent says today. It has no order tool, and the
scripted model has a rule for an order number that says so when the tool is missing:

```bash title="Terminal 2"
cd ~/bxagents-course/acme-support
bxAgents invoke --message=48213
```

```text title="You see"
I have no order tool yet, so I cannot look up order 48213.
```

Now write the tool. It returns a fixed answer, because the course has no order system; a real one would call yours.
`bxAgents add tool Orders --function=orderStatus` writes the same file with a typed function for you to fill in:

```javascript title="acme-support/tools/Orders.bx"
class {

	@AITool( "Look up an order by its number." )
	function orderStatus( orderNumber ) {
		return {
			number  : arguments.orderNumber,
			status  : "shipped",
			carrier : "UPS"
		};
	}

}
```

The agent also gets a tool from a module, without any code: bx-ai ships `now`, the current date and time. Name it in
`Agent.yml` (add these lines at the end of the file):

<!-- course: append -->
```yaml title="acme-support/Agent.yml"

tools:
  - now@bxai
```

Tools are found when you build, so rebuild and ask the scripted model what the agent can use. It has a rule that
lists the tools the request carried (the word is `capabilities`):

```bash title="Terminal 2"
bxAgents build
bxAgents invoke --message=capabilities
bxAgents invoke --message=48213
```

```text title="You see"
Build succeeded: <anything>/acme-support/.build/app
I can use these tools: <anything>
Order **48213**: <anything>
```

The model decided to call `orderStatus` with the number, BxAgents ran your function, and the answer used what it
returned. Open the terminal chat and ask again, and the tool call shows as a row above the answer.

## Checkpoint

`acme-support/` has `tools/Orders.bx` and a `tools:` list with `now@bxai`. `kit/resume.sh 09-giving-your-agent-tools`
restores both; rebuild after.

Full reference: [tools/](../conventions/tools.md). The web app lists every tool on its Registry page, which a later
lesson visits.

Next: [Packaging Skills](10-packaging-skills.md)
