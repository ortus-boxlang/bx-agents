---
title: Modelos y perfiles
icon: phosphor-duotone:brain
summary: El modelo por defecto, otros proveedores, perfiles con nombre y los valores por defecto de las capacidades, todo en Agent.yaml.
description: El modelo por defecto, otros proveedores, perfiles con nombre y los valores por defecto de las capacidades, todo en Agent.yaml.
tags: [conventions, models, profiles]
---

# Modelos y perfiles

El modelo que usa un agente se escribe en `Agent.yaml`. El build lo traduce a los ajustes de bx-ai, así que nunca escribes un `boxlang.json` para esto. Los nombres son los de bx-ai: `provider`, `model`, `params`, `options`, `providers`, `profiles`.

```yaml
provider: openai                 # el modelo por defecto
model: gpt-5
params: { temperature: 0.2 }

providers:                       # ajustes de otro proveedor
  claude: { params: { max_tokens: 4000 }, options: { timeout: 90 } }

profiles:                        # combinaciones con nombre
  fast:    { description: Barato y rápido, provider: openai, model: gpt-5-mini, params: { temperature: 0 } }
  planner: { description: Planificación cuidadosa, provider: claude, model: claude-opus-4, apiKeyEnv: ANTHROPIC_API_KEY }
defaultProfile: fast             # opcional

embeddings:    { provider: openai, model: text-embedding-3-small }
speech:        { provider: openai, model: tts-1, voice: nova }
transcription: { provider: openai, model: whisper-1 }
image:         { provider: openai, model: gpt-image-1, size: 1024x1024 }
```

## El modelo por defecto

`provider`, `model` y `params` son el modelo que usa todo agente cuando no dice otra cosa. `model: openai/gpt-5` sigue funcionando como atajo de `provider: openai` más `model: gpt-5`. `params` son parámetros de la petición como `temperature` y `max_tokens`. `options` (tiempo de espera y similares) se aplican al proveedor por defecto.

## Otros proveedores

`providers` guarda `params` y `options` de un proveedor por nombre, para los que usas mediante un perfil o un subagente. `bxAgents add provider` escribe uno por ti. La clave de cada proveedor se lee de su variable de entorno habitual (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, ...); `bxAgents doctor` avisa cuando falta alguna.

## Perfiles

Un perfil es una combinación con nombre: un proveedor, un modelo, params, options y el nombre de la variable de entorno que guarda su clave. Puede llevar una `description`.

| Clave | Significado |
|---|---|
| `description` | Para personas y para los selectores de la terminal y la web. |
| `provider`, `model` | Sobre qué se ejecuta. Un perfil sin proveedor usa el proveedor por defecto. |
| `params`, `options` | Se superponen a los del proveedor y a los por defecto: `params` del valor por defecto, luego el proveedor, luego el perfil. |
| `apiKeyEnv` | El **nombre** de la variable que guarda la clave. Una clave nunca se escribe en `Agent.yaml`; un perfil que la tenga se rechaza. |

Un perfil no puede llamarse `default` ni como un proveedor (`openai`, `claude`, ...), porque ambos se eligen por nombre. `defaultProfile` elige qué perfil se usa cuando nada pide otro. `bxAgents add profile` escribe un perfil (y `--default` el `defaultProfile`) sin tocar el resto del archivo; consulta [`add profile`](../cli-reference.md#add-profile).

## Qué usa cada agente

Un agente usa su propio `profile:`, si no su propio `model:` (un slug `provider/model`), si no el valor por defecto. Todo subagente hereda los ajustes de la raíz y puede fijar su propio `model` o `profile`:

```yaml
# subagents/planner/Agent.yaml
name: planner
profile: planner
```

`providers`, `profiles`, `defaultProfile`, `params` y las claves de capacidades se aplican a toda la app, así que van en el `Agent.yaml` propio del proyecto; un subagente que las fije falla la validación.

## Valores por defecto de capacidades

`embeddings`, `speech`, `transcription` e `image` fijan los valores por defecto de bx-ai para `aiEmbed()`, `aiSpeak()`, `aiTranscribe()` y `aiImage()`. No admiten perfiles. bx-ai tiene un único proveedor de audio, así que `speech` y `transcription` deben nombrar el mismo.

## Validación y pruebas

`bxAgents build` comprueba todo lo anterior con las reglas propias de bx-ai y nombra el archivo y la clave. En `bxAgents test` todo perfil se ejecuta con el proveedor `mock`, así que una prueba nunca llega a la red.

## Cómo llega a bx-ai

El build escribe los ajustes en `config/bxai-settings.json` dentro de la app, y la app los fusiona con los ajustes de bx-ai al arrancar, antes de que ColdBox arranque y construya los agentes. Viajan con la app dondequiera que se ejecute (`serve`, un `.bxa`, un contenedor).
