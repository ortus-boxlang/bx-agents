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
var agentContext = createObject( "java", "ortus.boxlang.runtime.BoxRuntime" ).getInstance().getRuntimeContext()
var agent = createObject( "java", "ortus.boxlang.bxagents.build.DynamicClassLoader" ).instantiate( "/absolute/path/to/agent/classes/agentClass.bx", agentContext )
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
bxAgents chat
```
