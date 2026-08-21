# Class-Based Agent

The same agent as [`minimal-agent`](../minimal-agent), written the other way.

`Agent.bx` here **extends bx-ai's `AiAgent`**, so it *is* the agent. The build
instantiates it rather than rebuilding one from a config struct.

```
class-based-agent/
├── Agent.bx          # extends AiAgent - name, model and instructions set in init()
└── tools/
    └── Greeter.bx    # still discovered and attached, exactly as usual
```

Note what is **not** here: no `configure()`, and no `instructions.md`. Both are
optional for a class-based agent, because the class already carries that
information.

## The rule

> An explicitly declared convention wins; otherwise the class is in charge.

So this project's generated factory is just:

```javascript
var agent = new "agent.classes.agentClass"()
agent.withTools( aiToolRegistry().getAll() )
agent.withCheckpointer( aiMemory( memory: "cache", config: {} ) )
```

Nothing is imposed on the identity the class set. `tools/` is still attached -
`withTools()` appends in bx-ai rather than replacing, so a class that registers
its own tools keeps them and gains the discovered ones. The checkpointer is the
one thing the build fills in unasked: an agent reachable from a gateway without
one has silently broken human-in-the-loop.

Add an `instructions.md`, or a `configure()` returning `name`/`model`/`memory`,
and those take over - see [conventions/agent-bx.md](../../docs/conventions/agent-bx.md).

## Build it

```bash
bxAgents build
bxAgents serve
```

Then, from another terminal, add a `gateways/expose.bx` (`{ exposes: "agent", path: "/api/chat" }`, see [gateways/](../../docs/conventions/gateways.md)) and rebuild, or use `bxAgents invoke --message="..." --server`.

{% hint style="danger" %}
`bxAgents chat` and the default (non-`--server`) `bxAgents invoke` currently
**fail** for a class-based `Agent.bx` like this one, with `The requested
class [agent.classes.agentClass] has not been located in any class
resolver.` Both load the generated `GeneratedAgentFactory.bx` in-process via
`DynamicClassLoader.instantiate()` (no ColdBox container, no registered
mapping for the app root), and that factory's own `new
"agent.classes.agentClass"()` call can't resolve without one - confirmed
this isn't fixable by registering a mapping mid-script either (the same
limitation already documented for `TestRunnerLauncher`'s TestBox discovery:
a `Configuration.registerMapping()` call made mid-script does not reliably
propagate to a class's own relative-path lookups within that same process).
`bxAgents serve` / `invoke --server` boot a real ColdBox container instead,
which registers this mapping as part of normal app startup, so those work
correctly. Only class-based `Agent.bx` projects hit this - a descriptor-style
`Agent.bx` (like [`minimal-agent`](../minimal-agent)) calls bx-ai's own
`aiAgent()` BIF instead of a relative `new "dotted.path"()`, so it has no
mapping to resolve in the first place.
{% endhint %}
