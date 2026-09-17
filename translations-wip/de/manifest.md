---
title: Das Manifest
icon: phosphor-duotone:clipboard-text
summary: Was jeder Build darüber festhält, was genau in die generierte App eingeflossen ist.
description: Was jeder Build darüber festhält, was genau in die generierte App eingeflossen ist.
tags: [reference, build]
---

# Das Manifest

Jeder `build` schreibt `.build/manifest.json` - BxAgents' eigenen Datensatz darüber, was genau in die generierte App eingeflossen ist. `bxAgents inspect` gibt es hübsch aus, ohne neu zu bauen; `bxAgents package` kopiert eine **geschwärzte** Version davon neben die `.bxa` (siehe [Deployment & Secrets](deployment-and-secrets.md)).

## Schema

```json
{
	"manifestVersion": "1.0.0",
	"generator": { "name": "bx-agents", "version": "dev" },
	"agent": {
		"name": "my-agent",
		"description": "",
		"model": "openai/gpt-5",
		"environment": "development"
	},
	"files": [
		{ "category": "tools", "name": "Greeter", "path": "tools/Greeter.bx", "hash": "..." }
	]
}
```

| Feld | Bedeutung |
|---|---|
| `manifestVersion` | Semver-Stempel für das Manifest-Schema selbst (aktuell `1.0.0`) - `package` verweigert die Ausführung, falls dieser Wert nicht gesetzt oder fehlerhaft ist. |
| `generator.name` / `generator.version` | Immer `"bx-agents"` / die BX-Agents-Modulversion, die diesen Build erzeugt hat. |
| `agent` | Nur sichere, strukturelle Felder (`name`, `description`, `model`, `environment`) - **nie** Secrets. Secrets werden überhaupt nie in das Manifest eingelesen; sie werden von bx-ai selbst, live, zur Laufzeit aufgelöst. |
| `files` | Ein Eintrag pro entdecktem Konventionsordner-Element, sortiert nach Kategorie und dann Pfad für deterministische Reihenfolge - unabhängig von der Auflistungsreihenfolge des Dateisystems. |

## Inhalts-Hashes

Der `hash` jedes `files[]`-Eintrags ist ein SHA-256 seines Inhalts:

- **Eine Datei**: der Hash ihres Inhalts, wobei Zeilenenden zuerst normalisiert werden (CRLF- und LF-Checkouts desselben Inhalts hashen identisch).
- **Ein Verzeichnis** (ein Skill-Ordner, ein Subagenten-Ordner, ein Modul-Ordner): der Hash aus dem eigenen `relativePath:contentHash` jeder enthaltenen Datei, rekursiv, für Determinismus sortiert - das Umbenennen oder Bearbeiten einer einzelnen enthaltenen Datei ändert also den Hash des gesamten Ordners.

Das ist es, was den erneuten Build eines unveränderten Projekts ein **identisches** Manifest erzeugen lässt: gleiche Kategorien, gleiche Reihenfolge, gleiche Hashes, jedes Mal - und genau deshalb ändert das Ändern einer einzelnen Tool-Datei stets nur den Hash dieses einen Eintrags, sonst nichts.

## Kompatibilitätsrichtlinie

`manifestVersion` existiert, damit eine zukünftige Breaking Change an diesem Schema von allem erkannt werden kann, das `manifest.json` liest (ein Deploy-Ziel, eine zukünftige `inspect`-Version, externes Tooling) - ein Tool, das auf eine unbekannte Hauptversion trifft, sollte sich weigern, die Form zu erraten, und klar fehlschlagen, statt Felder stillschweigend falsch zu interpretieren.
