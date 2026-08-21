---
title: schedules/
icon: phosphor-duotone:clock-countdown
summary: Ein echter, handgeschriebener ColdBox-Scheduler, unverändert durchgereicht.
description: Ein echter, handgeschriebener ColdBox-Scheduler, unverändert durchgereicht.
tags: [conventions, scheduling]
---

# schedules/

`schedules/Scheduler.bx` - falls vorhanden - ist eine **echte, handgeschriebene ColdBox-Scheduler-Klasse**, die unverändert in den Build durchgereicht wird (eine reine Dateikopie nach `config/Scheduler.bx`, keine Generierung, keine Übersetzung):

```javascript
// schedules/Scheduler.bx
class extends="coldbox.system.web.tasks.ColdBoxScheduler" {

	function configure() {
		task( "nightly" )
			.call( () => getInstance( "SupportBot" ).run( "cleanup" ) )
			.everyDayAt( "00:00" )
			.withNoOverlaps()
	}

}
```

Am Inhalt dieser Datei ist nichts BX-Agents-Spezifisches - es ist ColdBoxs eigene Scheduler-DSL, vollständig: `.cron( "0 9 * * 1-5" )`, `.everyWeekOn()`, `.startOn()`/`.endOn()`/`.between()`, `.when()`, `.withNoOverlaps()`, `before()`/`after()`/`onSuccess()`/`onFailure()`-Hooks, Zeitzonen - alles, was ColdBoxs `ScheduledTask` unterstützt, schränkt dieses Projekt weder ein noch interpretiert es um. (Eine frühere Version dieser Konvention war eine `{ cron, action }`-Datenform, hier in ColdBoxs Frequenzmethoden-DSL übersetzt - diese Übersetzung deckte nur eine schmale Teilmenge von Cron ab und warf alles andere weg, was die echte Scheduler-API bietet, sie ist also weg. Wer ein altes Projekt migriert, siehe unten.)

## Einen Agenten abrufen

Jeder Agent im Baum des Projekts - das eigene `Agent.bx` des Root-Projekts und jeder `subagents/*`-Eintrag, wie tief auch immer verschachtelt - wird in der generierten `config/WireBox.bx` unter seinem eigenen deklarierten `name` registriert (dem `name`, den sein `Agent.bx` über `super.init()` gesetzt hat, oder einem per `configure()` deklarierten `name`, der ihn überschreibt). Ein Schedule erreicht welchen Agenten auch immer es will mit einem einfachen `getInstance( "TheAgentName" )` - keine BX-Agents-spezifische Lookup, nur WireBox, genau wie die `getInstance()`-Aufrufe an anderer Stelle in einer ColdBox-App.

```javascript
// subagents/researcher/Agent.bx
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name  : "ResearchBot",
			model : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

}
```

```javascript
// schedules/Scheduler.bx
task( "weekly-digest" )
	.call( () => getInstance( "ResearchBot" ).run( "summarize this week's findings" ) )
	.everyWeekOn( 1, "08:00" )
```

Weil `name` jetzt auch ein WireBox-Bindungsschlüssel ist, muss er **über das gesamte Projekt hinweg eindeutig** sein - `build` schlägt bei der Validierung fehl, falls zwei Agenten (Root oder Subagent, in beliebiger Tiefe) sich einen Namen teilen, einschließlich zweier, die beide unset lassen und still auf `"BxAi"` zurückfallen. Siehe [subagents/](subagents.md#retrieving-an-agent-from-schedulesschedulerbx) für die Unterscheidung zwischen dem Ordnernamen eines Subagenten (genutzt, um `subAgents: [...]` zu verdrahten) und seinem eigenen deklarierten `name` (hier genutzt).

## Validierung

- `build` sucht nur nach genau einer Datei: `schedules/Scheduler.bx`. Alles andere in `schedules/` (einschließlich alter `{ cron, action }`-Dateien von vor der Änderung dieser Konvention) wird ignoriert - `build` gibt eine Warnung aus, falls `schedules/` existiert, aber kein `Scheduler.bx` enthält, sodass ein still gestoppter Schedule wenigstens sichtbar ist.
- Darüber hinaus ist `schedules/Scheduler.bx` echter Code - dasselbe "wir können das ohne einen echten ColdBox-Boot nicht sinnvoll validieren"-Terrain wie bei jeder anderen BoxLang-Klasse. Ein Syntaxfehler oder ein falscher `getInstance()`-Name tauchen erst auf, wenn die generierte App tatsächlich bootet (`serve`), nicht zur `build`-Validierungszeit.

## Migration von der alten `{ cron, action }`-Konvention

Zuvor war jede Datei unter `schedules/` ein eigener `{ cron: "0 0 * * *", action: "cleanup" }`-Eintrag, übersetzt in einen ColdBox-Frequenzmethoden-Aufruf gegen die einzelne Root-Bindung `"GeneratedAgent"`. Zur Migration: diese Dateien löschen, ein `schedules/Scheduler.bx` hinzufügen, das `coldbox.system.web.tasks.ColdBoxScheduler` erweitert, und für jeden alten Eintrag ein `task( name ).call( () => getInstance( "TheAgentName" ).run( "action text" ) )` hinzufügen, mit welcher echten ColdBox-Frequenzmethode oder welchem `.cron()`-Aufruf auch immer zum alten Cron-Ausdruck passt.
