---
title: modules/
icon: phosphor-duotone:cube
summary: Dependencias de módulos de BoxLang, una subcarpeta inmediata por módulo.
description: Dependencias de módulos de BoxLang, una subcarpeta inmediata por módulo.
tags: [conventions, modules]
---

# modules/

`modules/` contiene las dependencias de módulos de BoxLang que tu agente necesita - una subcarpeta inmediata por módulo, descubierta por nombre de carpeta (no recursivo - solo se enumera el nivel superior de `modules/`).

```
modules/
└── my-extra-module/
    ├── module.json
    └── ...
```

## Declarar dependencias entre módulos

Una carpeta de módulo puede incluir un `module.json` con un array `dependsOn` que nombra otras entradas `modules/*` por nombre de carpeta:

```json
{
	"dependsOn": [ "some-other-module" ]
}
```

Esta es la propia convención de declaración de dependencias de BxAgents para propósitos de validación - es independiente del propio mecanismo de carga de módulos de BoxLang.

## Validación

- Un `module.json` que no sea JSON válido falla el build con un error de análisis que nombra al módulo culpable.
- Una entrada de `dependsOn` que nombra un módulo que no es en sí mismo una carpeta `modules/*` descubierta falla la validación ("depends on unknown module").
- **Las dependencias circulares** se rechazan de la misma manera que se rechazan los ciclos de [subagentes](subagents.md) - se reporta la ruta completa del ciclo, detección basada en DFS, no ocurre generación de código hasta que el grafo sea acíclico.
- Un `module.json` es completamente opcional - se asume que una carpeta de módulo sin uno no tiene dependencias declaradas.
