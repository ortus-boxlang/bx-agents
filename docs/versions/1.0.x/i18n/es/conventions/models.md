---
title: models/
icon: phosphor-duotone:brain
summary: Configuraciones de modelo reutilizables y nombradas, referenciadas desde Agent.yaml por nombre.
description: Configuraciones de modelo reutilizables y nombradas, referenciadas desde Agent.yaml por nombre.
tags: [conventions, models]
---

# models/

`models/` te permite definir configuraciones de modelo reutilizables y nombradas como un archivo `.bx` o `.json` cada una, referenciadas desde el campo `model` de `Agent.yaml` por nombre (sin `/`, así no se confunde con un slug `provider/model`):

```javascript
// models/summarizer.bx
class {

	function configure() {
		return {
			provider : "openai",
			model    : "gpt-5-mini"
		};
	}

}
```

```yaml
# Agent.yaml - se resuelve contra models/summarizer.bx
name: my-agent
model: summarizer
```

## Reglas de descubrimiento

- Una entrada por cada archivo `.bx` o `.json` de nivel superior directamente bajo `models/` (no recursivo).
- El nombre de la entrada es el nombre base del archivo (`summarizer.bx` → `summarizer`).
- Los dotfiles y los archivos con una extensión no reconocida (como un `README.md` dejado en la carpeta para tus propias notas) se ignoran.
- Dos archivos que resuelven al mismo nombre fallan la validación con un error de nombre duplicado.

## Validación

Si el `model` del agente no tiene `/`, debe ser **ya sea** un nombre de proveedor central conocido (ver [el slug de modelo](agent-bx.md#the-model-slug)) **o** coincidir con el nombre de una entrada de `models/` - cualquier otra cosa falla la validación con un error claro de "no provider and does not match any models/ entry".
