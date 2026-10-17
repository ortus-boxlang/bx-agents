---
title: "Lección 6: instructions.md y el system prompt"
icon: phosphor-duotone:note-pencil
summary: El archivo opcional que se convierte en el system prompt de tu agente.
description: El archivo opcional que se convierte en el system prompt de tu agente.
tags: [course, conventions]
---

# instructions.md y el system prompt

`instructions.md` es **opcional** - `bxAgents new` crea uno inicial para que lo edites,
pero tienes dos opciones igual de válidas sobre dónde vive el system prompt de tu agente:

1. Definir `instructions` en línea en `Agent.yaml`.
2. Colocar un archivo `instructions.md` junto a `Agent.yaml` y dejar que el build lo conecte.

## Dejar que gane el archivo

Si `instructions.md` existe, el build emite:

```javascript
withInstructions( fileRead( "instructions.md" ) )
```

lo que gana frente a un `instructions` en línea en `Agent.yaml` (o a lo que hubiera fijado
una clase). En la práctica este es el patrón
más habitual - mantiene el prompt como texto plano que puedes editar sin tocar código
BoxLang, y es fácil de revisar en un pull request.

```markdown
# instructions.md
You are a helpful assistant for a small hardware store. Be concise. If a customer
asks about a product you don't have information on, say so rather than guessing.
```

## Definirlo en línea

```yaml
name: my-agent
model: openai/gpt-5
instructions: |
  You are a helpful assistant.
  Keep answers short.
```

Haz esto para un prompt corto, o cuando prefieras tener todo lo relativo al agente en un
solo archivo. Si existen ambos, gana `instructions.md`; si no existe ninguno, el build
falla y lo indica. Un prompt que deba generarse o construirse con plantillas en código
pertenece al `Agent.bx` avanzado basado en clase (consulta el final de la
[Lección 5](05-agent-bx.md)).

## ¿Cuál deberías elegir?

Empieza con `instructions.md` - es lo que crea `bxAgents new`, es el modelo mental más
simple ("el system prompt es este archivo"), y encaja bien con el resto de este curso, que
asume prompts en texto plano en todo momento. Recurre a la clave `instructions` en línea
solo para un prompt corto, y al código solo cuando tengas una razón concreta (plantillas, prompts específicos por entorno ensamblados a partir
de piezas más pequeñas, etc.).

## Pruébalo

Abre el `instructions.md` que creó el `bxAgents new` de la
[Lección 4](04-scaffolding-your-first-agent.md) y escribe un system prompt real para el tipo
de agente que quieras construir en este curso - un bot de soporte, un revisor de código, lo
que sea. Lo construirás y lo ejecutarás en las dos lecciones siguientes.

Siguiente: [Lección 7 - Construir tu agente](07-building-your-agent.md)
