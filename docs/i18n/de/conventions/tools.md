---
title: tools/
icon: phosphor-duotone:wrench
summary: Jede @AITool-annotierte Funktion unter tools/ wird zu einem aufrufbaren Tool.
description: Jede @AITool-annotierte Funktion unter tools/ wird zu einem aufrufbaren Tool.
tags: [conventions, tools]
---

# tools/

Jede `.bx`-Datei unter `tools/` (**rekursiv** durchsucht, sodass auch Unterordner wie `tools/nested/Search.bx` funktionieren), die eine mit `@AITool` annotierte Funktion deklariert, wird zu einem für den Agenten aufrufbaren Tool.

```javascript
// tools/Greeter.bx
class {

	@AITool( "Say hello to someone by name." )
	function sayHello( name ) {
		return "Hello, " & arguments.name & "!";
	}

}
```

BX Agents scannt oder interpretiert `@AITool`-Annotationen nicht selbst - es entdeckt einen Eintrag pro `.bx`-Datei (zur Prüfung auf Namenskollisionen) und kopiert dann den gesamten `tools/`-Ordner **unverändert** in die generierte App. Beim Start ruft die generierte App bx-ais eigenen Scanner auf:

```javascript
aiToolRegistry().scan( "tools" )
```

der die eigentliche Reflection-Arbeit erledigt (die kopierten Dateien durchlaufen, jede Klasse instanziieren, `@AITool`-Funktionen finden). Diese Anweisung wird nur überhaupt eingefügt, wenn das Projekt tatsächlich einen `tools/`-Ordner mit Dateien darin hat.

## Namensgebung

Der entdeckte Eintragsname ist der eigene Basisname der Datei (`Greeter.bx` → `Greeter`). Zwei Tool-Dateien mit demselben Basisnamen (selbst in unterschiedlichen Unterordnern, da die Discovery nach Basisnamen flach arbeitet) schlagen bei der Validierung mit einem Fehler wegen doppeltem Namen fehl.

## Was ausgeschlossen ist

- Dotfiles (alles, was mit `.` beginnt) werden von der Discovery ignoriert.
- `.env`/Dotfiles innerhalb von `tools/` werden nie in die Build-Ausgabe kopiert, selbst wenn vorhanden - der Kopierschritt schließt sie explizit aus.

## Rebuilds

`tools/` wird mit einer Wipe-dann-Schreib-Strategie kopiert: Das eigene `tools/`-Verzeichnis der generierten App wird bei jedem `build` gelöscht und neu geschrieben, sodass eine aus dem eigenen `tools/`-Ordner des Projekts entfernte Datei nicht als veraltete Ausgabe eines vorherigen Builds hängen bleibt.
