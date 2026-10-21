---
title: models/
icon: phosphor-duotone:brain
summary: Configuraciones de modelo reutilizables y nombradas, referenciadas desde Agent.yaml por nombre.
description: Configuraciones de modelo reutilizables y nombradas, referenciadas desde Agent.yaml por nombre.
tags: [conventions, models]
---

# models/

`models/` guarda configuraciones de modelo reutilizables y nombradas, un archivo YAML o JSON cada una: un proveedor, un modelo y los ajustes que los acompañan. Un agente usa una escribiendo su nombre como `model` (sin `/`, así no se confunde con un slug `provider/model`). Piensa en `researcher`, `coder`, `summarizer`: la misma configuración compartida por varios agentes y subagentes, escrita una sola vez.

```yaml
# models/researcher.yaml
description: Cheap, careful model for research
provider: openai
model: gpt-5-mini
params:
  temperature: 0.2
  max_tokens: 2000
```

```yaml
# Agent.yaml - se resuelve contra models/researcher.yaml
name: my-agent
model: researcher
```

## Qué puede decir una entrada

| Clave | Significado |
|---|---|
| `provider` | Obligatoria. Un proveedor que bx-ai conoce: ver [el slug de modelo](agent-bx.md#the-model-slug). |
| `model` | El modelo del proveedor. Si se omite, se aplica el modelo por defecto del proveedor. |
| `description` | Para las personas. |
| `apiKeyEnvVar` | El **nombre** de una variable de entorno de la que leer la clave, en lugar de la habitual del proveedor (`OPENAI_API_KEY`). Úsala cuando dos modelos del mismo proveedor necesiten claves distintas. La clave nunca se escribe en el archivo, y si falta la variable el agente no arranca y la nombra. |
| `params` | Un mapeo que se envía con cada petición: `temperature`, `max_tokens`, lo que acepte el proveedor. |
| `options` | Un mapeo de opciones de modelo de bx-ai como `timeout` o `logRequest`. |

Una clave desconocida, un `params` que no sea un mapeo, un proveedor desconocido y una `apiKey` escrita en `params` u `options` hacen fallar `build` con el nombre de la entrada.

`bxAgents add model` escribe una por ti: ver [`add`](../cli-reference.md#add-model).

Una clase `.bx` que devuelva el mismo struct desde `configure()` también sigue funcionando, para los proyectos que ya tengan una; las entradas nuevas usan YAML y JSON.

## Reglas de descubrimiento

- Una entrada por cada archivo `.yaml`, `.yml` o `.json` de nivel superior directamente bajo `models/` (no recursivo), o una clase `.bx` heredada.
- El nombre de la entrada es el nombre base del archivo (`researcher.yaml` → `researcher`).
- Un nombre que también sea un proveedor (`openai`, `claude`, ...) se leería como el proveedor mismo, por lo que `add model` lo rechaza.
- Los dotfiles y los archivos con una extensión no reconocida (como un `README.md` dejado en la carpeta para tus propias notas) se ignoran.
- Dos archivos que resuelven al mismo nombre fallan la validación con un error de nombre duplicado.

## Validación

Si el `model` del agente no tiene `/`, debe ser **ya sea** un nombre de proveedor central conocido (ver [el slug de modelo](agent-bx.md#the-model-slug)) **o** coincidir con el nombre de una entrada de `models/` - cualquier otra cosa falla la validación con un error claro "no provider and does not match any models/ entry".
