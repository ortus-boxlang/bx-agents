---
title: modules/
icon: phosphor-duotone:cube
summary: BoxLang-Modulabhängigkeiten, ein unmittelbarer Unterordner pro Modul.
description: BoxLang-Modulabhängigkeiten, ein unmittelbarer Unterordner pro Modul.
tags: [conventions, modules]
---

# modules/

`modules/` enthält die BoxLang-Modulabhängigkeiten, die der eigene Agent braucht - ein unmittelbarer Unterordner pro Modul, entdeckt anhand des Ordnernamens (nicht rekursiv - nur die oberste Ebene von `modules/` wird erfasst).

```
modules/
└── my-extra-module/
    ├── module.json
    └── ...
```

## Abhängigkeiten zwischen Modulen deklarieren

Ein Modulordner kann eine `module.json` mit einem `dependsOn`-Array enthalten, das andere `modules/*`-Einträge nach Ordnername benennt:

```json
{
	"dependsOn": [ "some-other-module" ]
}
```

Das ist BX Agents' eigene Konvention zur Abhängigkeitsdeklaration für Validierungszwecke - sie ist unabhängig vom eigenen Modul-Ladermechanismus von BoxLang.

## Validierung

- Eine `module.json`, die kein gültiges JSON ist, lässt den Build mit einem Parse-Fehler scheitern, der das betroffene Modul benennt.
- Ein `dependsOn`-Eintrag, der ein Modul benennt, das selbst kein entdeckter `modules/*`-Ordner ist, schlägt bei der Validierung fehl ("depends on unknown module").
- **Zirkuläre Abhängigkeiten** werden auf dieselbe Weise abgelehnt wie [Subagenten](subagents.md)-Zyklen - vollständiger Zyklenpfad gemeldet, DFS-basierte Erkennung, keine Codegenerierung, bevor der Graph azyklisch ist.
- Eine `module.json` ist vollständig optional - ein Modulordner ohne eine solche wird als ohne deklarierte Abhängigkeiten angenommen.
