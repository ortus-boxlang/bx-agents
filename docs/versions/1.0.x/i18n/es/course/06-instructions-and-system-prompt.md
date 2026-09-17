---
title: "Lección 6: instructions.md y el system prompt"
icon: phosphor-duotone:note-pencil
summary: El archivo opcional que se convierte en el system prompt de tu agente.
description: El archivo opcional que se convierte en el system prompt de tu agente.
tags: [course, conventions]
---

# instructions.md y el system prompt

`instructions.md` es **opcional** - `bxAgents new` crea uno vacío para que lo rellenes,
pero tienes dos opciones igual de válidas sobre dónde vive el system prompt de tu agente:

1. Definir `instructions` directamente en el `super.init()` de `Agent.bx`.
2. Colocar un archivo `instructions.md` junto a `Agent.bx` y dejar que el build lo conecte.

## Dejar que gane el archivo

Si `instructions.md` existe, el build emite:

```javascript
withInstructions( fileRead( "instructions.md" ) )
```

lo que sobrescribe lo que hubiera fijado la propia clase. En la práctica este es el patrón
más habitual - mantiene el prompt como texto plano que puedes editar sin tocar código
BoxLang, y es fácil de revisar en un pull request.

```markdown
# instructions.md
You are a helpful assistant for a small hardware store. Be concise. If a customer
asks about a product you don't have information on, say so rather than guessing.
```

## Definirlo en la clase

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "my-agent",
			instructions: "You are a helpful assistant.",
			model       : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

}
```

Haz esto cuando el prompt se genere o se construya con plantillas en código, o cuando
prefieras tener todo lo relativo al agente en un solo archivo. Si `instructions.md` no
existe (o está vacío), las instrucciones de la propia clase se mantienen intactas.

## ¿Cuál deberías elegir?

Empieza con `instructions.md` - es lo que crea `bxAgents new`, es el modelo mental más
simple ("el system prompt es este archivo"), y encaja bien con el resto de este curso, que
asume prompts en texto plano en todo momento. Recurre a definirlo en la clase solo cuando
tengas una razón concreta (plantillas, prompts específicos por entorno ensamblados a partir
de piezas más pequeñas, etc.).

## Pruébalo

Abre el `instructions.md` que creó el `bxAgents new` de la
[Lección 4](04-scaffolding-your-first-agent.md) y escribe un system prompt real para el tipo
de agente que quieras construir en este curso - un bot de soporte, un revisor de código, lo
que sea. Lo construirás y lo ejecutarás en las dos lecciones siguientes.

Siguiente: [Lección 7 - Construir tu agente](07-building-your-agent.md)
