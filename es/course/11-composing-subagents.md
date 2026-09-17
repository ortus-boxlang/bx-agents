---
title: "Lección 11: Componer subagentes"
icon: phosphor-duotone:tree-structure
summary: Agentes anidados, cada uno un proyecto BxAgents corriente por sí mismo, cableados como tools invocables.
description: Agentes anidados, cada uno un proyecto BxAgents corriente por sí mismo, cableados como tools invocables.
tags: [course, conventions, subagents]
---

# Componer subagentes

`subagents/` contiene agentes anidados - cada uno un proyecto BxAgents corriente por sí
mismo, con su propio `Agent.bx` + `instructions.md`, y opcionalmente sus propios `tools/`,
`skills/`, etc.

```
my-agent/
├── Agent.bx              # subAgents: ["researcher"]
├── instructions.md
└── subagents/
    └── researcher/
        ├── Agent.bx
        └── instructions.md
```

Un subagente se cablea a su padre por nombre, declarado en el `configure()` del `Agent.bx`
del padre - este es el **nombre de la carpeta** en `subagents/`:

```javascript
function configure() {
	return {
		subAgents : [ "researcher" ]
	};
}
```

En tiempo de build, el `addSubAgent()` de bx-ai envuelve automáticamente cada instancia de
subagente construida como una tool invocable del padre - no hay ningún paso aparte de
envoltura de tools que tengas que escribir tú.

## Plano en disco, un grafo en la configuración

Todos los subagentes - por muy profundamente que los referencie la configuración de otro
subagente - viven directamente bajo la carpeta `subagents/` del proyecto **raíz**. Los nombres
`subAgents` que declara un subagente referencian entradas **hermanas** de esa misma carpeta de
nivel raíz, nunca una carpeta anidada bajo él.

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

Un ciclo en el grafo declarado (`A -> B -> A`) se rechaza en la validación, antes de generar
nada. Un rombo (dos padres que comparten un descendiente) no supone ningún problema.

## Dos nombres distintos, dos funciones distintas

- El **nombre de la carpeta** bajo `subagents/` es a lo que hace referencia
  `subAgents: [ "..." ]` - puramente una cuestión de cableado en tiempo de build.
- El **`name` declarado** por el propio subagente (el campo `name` de su `Agent.bx`) es por
  lo que lo recuperas en tiempo de ejecución - cada agente del árbol queda registrado en
  `config/WireBox.bx` bajo ese nombre, así que [`schedules/Scheduler.bx`](../conventions/schedules.md)
  (o cualquier otra cosa que conozca WireBox) lo alcanza con `getInstance( "TheAgentName" )`.

Estos dos nombres pueden diferir, y a menudo diferirán. Como `name` es también una clave de
binding de WireBox, debe ser único en todo el proyecto - `build` falla la validación si dos
agentes comparten uno.

## Pruébalo

Crea una carpeta `subagents/researcher/` como su propio pequeño proyecto BxAgents (con su
propio `Agent.bx` + `instructions.md`), y después cablea el subagente en el `configure()` de
tu `Agent.bx` raíz. Reconstruye y pregunta a tu agente raíz algo que naturalmente delegaría en
el subagente investigador - es invocable exactamente igual que cualquier otra tool.

Referencia completa: [subagents/](../conventions/subagents.md).

Siguiente: [Lección 12 - Configuraciones de modelo con nombre](12-named-model-configs.md)
