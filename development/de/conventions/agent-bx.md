---
title: Agent.bx
icon: phosphor-duotone:robot
summary: "Die eine erforderliche Datei - eine Klasse, die bx-ais eigenes AiAgent erweitert, sodass sie DER Agent IST."
description: "Die eine erforderliche Datei - eine Klasse, die bx-ais eigenes AiAgent erweitert, sodass sie DER Agent IST."
tags: [conventions, configuration]
---

# Agent.bx

`Agent.bx` ist die einzige erforderliche Datei in einem BX-Agents-Projekt. Sie **erweitert bx-ais eigenes [`AiAgent`](https://ai.ortusbooks.com/main-components/agents/class-based-agents)**, sie *ist* also der Agent - der Build instanziiert sie, statt eine aus einer Konfigurationsstruktur neu aufzubauen, sodass das, was geschrieben wird, auch läuft. Erben und hinzufügen, was gebraucht wird: private Hilfsmethoden, überschriebene Methoden, im Code registrierte Tools. Weil es sich um eine echte Klasse statt um einen struct-zurückgebenden Deskriptor handelt, kann eine IDE sie wie jede andere BoxLang-Klasse introspizieren - Sprung zur Definition, Autovervollständigung auf geerbten Methoden, alles.

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "my-agent",
			description : "A helpful assistant",
			instructions: "You are a helpful assistant.",
			model       : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

}
```

`bxAgents new` erzeugt genau diese Form als Gerüst. `instructions.md` ist optional - `instructions` direkt in `super.init()` setzen, oder die Datei neben `Agent.bx` ablegen und sie vom Build einbinden lassen (siehe Tabelle unten).

## Was der Build über die Klasse legt

> **Die Regel:** eine explizit deklarierte Konvention gewinnt; ansonsten hat die Klasse das letzte Wort.

Ein Agent, der alles in seiner eigenen `init()` setzt, bekommt also nichts aufgezwungen, während einer, der nur das Minimum setzt, trotzdem die Konventionen übernimmt, für die er nichts erklärt hat. Alles Folgende ist **optional** - eine `configure()` deklarieren, die einen dieser Schlüssel zurückgibt, um zu überschreiben, was die Klasse selbst gesetzt hat, oder den passenden Konventionsordner `instructions.md`/`tools/`/`subagents/`:

| Was deklariert wird | Was der Build erzeugt | Wenn nicht deklariert |
|---|---|---|
| `instructions.md` | `withInstructions( fileRead( ... ) )` | die eigenen Instruktionen der Klasse bleiben bestehen |
| `model` in `configure()` | `setModel( aiModel( ... ) )` | das eigene Modell der Klasse bleibt bestehen |
| `name` / `description` in `configure()` | `setName()` / `setDescription()` | die eigenen Werte der Klasse bleiben bestehen |
| `memory` in `configure()` | `setMemory( ... )` | der eigene Wert der Klasse bleibt bestehen |
| *(nichts zu deklarieren)* | `withTools( aiToolRegistry().getAll() )` | immer - `withTools()` **hängt an** in bx-ai statt zu ersetzen, sodass von der Klasse selbst registrierte Tools erhalten bleiben und die entdeckten `tools/` hinzugefügt werden |
| `subAgents` an der Klasse, oder `subagents/` auf der Platte | `addSubAgent( ... )` pro Kind | wird auf dieselbe Weise angehängt |
| `checkpointer` in `configure()` | `withCheckpointer( ... )` | **wird trotzdem eingesetzt**, falls die Klasse keinen gesetzt hat - siehe unten |

!!! info
    Der Checkpointer ist das Einzige, das der Build ungefragt einsetzt. Ein von einem Gateway aus erreichbarer Agent ohne Checkpointer hat *stillschweigend* kaputtes Human-in-the-Loop, also erhält eine Klasse, die keinen gesetzt hat, trotzdem den `cache`-Standard. Eine Klasse, die einen eigenen setzt, wird unangetastet gelassen.

!!! warning
    Bewusst **nicht** implementiert durch den Vergleich der eigenen Instanz mit bx-ais `DEFAULT_AGENT_*`-Werten. "Wollte die Autorin das so, oder ist das nur der Standardwert?" ist unbeantwortbar, und eine Autorin, die tatsächlich den Standardnamen wollte, würde ihn stillschweigend ersetzt vorfinden. Das Vorhandensein einer externen Deklaration ist eine Tatsache; die Absicht hinter einem Standardwert ist es nicht.

Die Klasse wird in die generierte App nach `agent/classes/` kopiert und dort über ihren eigenen absoluten Dateipfad instanziiert (nie eine relative Lookup, die von einer registrierten Zuordnung abhängen würde), genau wie `tools/`, `skills/` und `mcp/` kopiert werden - sodass eine paketierte `.bxa` sie mitführt, und `chat`/`invoke`/`serve` sie alle auf dieselbe Weise instanziieren, egal ob ein echter ColdBox-Container bootet oder nicht.

## `configure()` (optional) - überschreibt, was die Klasse gesetzt hat

Eine `configure()`-Methode ist vollständig optional. Sie nur deklarieren, um bestimmte Felder von außerhalb der Klasse zu überschreiben - nützlich, um deploymentspezifische Werte (z. B. ein anderes Modell pro Umgebung) aus dem Klassenkörper selbst herauszuhalten:

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name  : "with-mcp-servers-agent",
			model : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

	function configure() {
		return {
			mcpServers : [
				"https://example.com/mcp",
				{ url : "https://other.com/mcp", name : "other" }
			]
		};
	}

}
```

| Feld | Typ | Hinweise |
|---|---|---|
| `name` | string | Wird zur Build-Zeit auch zum Bindungsschlüssel dieses Agenten in `config/WireBox.bx` (`getInstance( name )`) - siehe [schedules/](schedules.md) - muss also im gesamten Projekt eindeutig sein (Root + jeder Subagent); `build` schlägt fehl, falls zwei Agenten sich einen Namen teilen. |
| `model` | string | Ein `provider/model`-Slug, ein bloßer Provider-Name, oder ein Name, der zu einem [`models/`](models.md)-Eintrag passt. Siehe unten. |
| `description` | string | Optional. |
| `subAgents` | array of strings | Namen von Geschwister-Ordnern unter dem `subagents/` des Root-Projekts. Siehe [subagents/](subagents.md). |
| `mcpServers` | array | Remote-MCP-Server - jeder Eintrag ein URL-String oder `{ url, name }`. Siehe [mcp/](mcp.md). |
| `security` | struct | Wird unverändert in die `bxai`-Moduleinstellungen der generierten App weitergereicht; bx-ais eigener `SecurityDirector` macht daraus Guardrail-Middleware. Nur Durchreichung - BxAgents hat keine eigene Guardrails-Konvention. |
| `memory` | string oder struct | Das Konversationsgedächtnis des Agenten. Ein bloßer String ist eine Kurzform für den Typ (`"cache"`); eine Struktur ist `{ type, ...config }` und wird unverändert an `aiMemory()` weitergereicht - z. B. `{ type: "cache", maxMessages: 50 }`, oder mit `summaryProvider`/`summaryModel`/`summaryThreshold`, damit `/compact` in der Web-UI funktioniert. Gilt pro Knoten, ein Subagent kann also einen eigenen deklarieren. |
| `checkpointer` | struct | `{ type: "cache"\|"file"\|"jdbc", ...config }`. Fällt bei Weglassen auf `{ type: "cache" }` zurück. Immer angewendet - ohne einen scheitern Human-in-the-Loop-Genehmigungsabläufe über jedes Gateway außer `cli` vollständig. |
| `gatewaySession` | struct | `{ policy, maxQueueDepth }`, beide optional (Standard `"queue"` / `50`). Nur relevant, falls das Projekt mindestens einen Push-Style-[Gateway](gateways.md#3-push-style-gateways-type-telegram--slack--discord--email--whatsapp-cloud--teams--twilio--github--signal-and-friends)-Eintrag hat - steuert die Richtlinie der generierten `GatewaySession` für eine zweite eingehende Nachricht, die auf einem Thread eintrifft, auf dem bereits ein Turn läuft. `policy` muss `reject`/`queue`/`steer`/`interrupt` sein. |
| jeder andere Schlüssel | any | Wird gemergt und ist in der aufgelösten Konfigurationsstruktur verfügbar, wird aber von BxAgents selbst nicht interpretiert. |

## The model slug

`model` ist BxAgents' eigene Konvention - bx-ai selbst nimmt `provider` und `model` als zwei separate Argumente an `aiModel()`. BxAgents teilt den Slug **nur am ersten `/`**, sodass ein Provider, der selbst einen Schrägstrich enthält (wie OpenRouters `openrouter/anthropic/claude-x`), trotzdem korrekt geparst wird:

| `model`-Wert | provider | model |
|---|---|---|
| `openai/gpt-5` | `openai` | `gpt-5` |
| `openrouter/anthropic/claude-x` | `openrouter` | `anthropic/claude-x` |
| `mock/mock-model` | `mock` | `mock-model` |

Hat `model` überhaupt keinen `/`, muss es entweder ein bekannter Core-Provider-Name sein oder zum Namen eines [`models/`](models.md)-Eintrags passen - die Validierung lehnt alles andere ab. Die erkannten Core-Provider sind: `bedrock`, `claude`, `cohere`, `deepseek`, `docker`, `elevenlabs`, `gemini`, `grok`, `groq`, `huggingface`, `minimax`, `mistral`, `mock`, `ollama`, `openai`, `openai-compatible`, `openrouter`, `perplexity`, `voyage` (mit bx-ais eigenem `CORE_PROVIDERS` synchron gehalten). `mock` ist ein echter Provider, nützlich für Tests und CI - er macht nie einen Netzwerkaufruf.

Diese Slug-Aufteilungskonvention durchläuft ein per `configure()` deklarierter `model`-String - `super.init()`s eigenes `model`-Argument nimmt hingegen direkt eine echte `AiModel`-Instanz (`aiModel( provider: "...", params: { model: "..." } )`), da die Klasse bereits bx-ais eigene API spricht.

## Umgebungs-Overrides

`Agent.bx` kann eine nach einer Umgebung benannte Methode deklarieren (z. B. `production()`, `development()`, oder ein beliebiger eigener Name), die eine Struktur von Overrides zurückgibt - das funktioniert unabhängig davon, ob die Klasse auch eine `configure()` deklariert:

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "override-agent",
			description : "An agent with an environment override",
			model       : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

	function production() {
		return {
			model : "openai/gpt-5-mini"
		};
	}

}
```

Die aktive Umgebung wird nach dieser Rangfolge aufgelöst (höchste gewinnt):

1. `--environment`-CLI-Flag (`bxAgents build --environment=production`)
2. Umgebungsvariable `BX_AGENTS_ENV`
3. `"development"` (Standard)

Das ist eine reine **Build-Zeit**-Entscheidung, unabhängig von ColdBoxs eigener Laufzeit-Umgebungserkennung (die generierte App liest `getSetting("environment")` selbst, gemäß ColdBoxs `environments`-Konvention) - diese Rangfolge entscheidet nur, welche `environment()`-Override-Methode an `Agent.bx`, und welche `boxlang-{env}.json`/`miniserver-{env}.json`-Dateien, die Build-Pipeline anwendet.

Existiert keine zur aktiven Umgebung passende Methode, wird kein Override angewendet.

## Merge-Semantik

Die vollständige Auflösungsreihenfolge (niedrigste zu höchste Priorität) ist:

1. `configure()` (optional)
2. die passende Umgebungs-Override-Methode, falls vorhanden
3. `boxlang.json`
4. `boxlang-{environment}.json`
5. `miniserver.json`
6. `miniserver-{environment}.json`

Struct-Schlüssel werden **rekursiv** gemergt - eine verschachtelte Struktur aus einer höher priorisierten Quelle überschreibt nur die Schlüssel, die sie tatsächlich setzt, und lässt Geschwisterschlüssel aus einer niedriger priorisierten Quelle unangetastet. Arrays und alle skalaren Werte werden **vollständig ersetzt**, nie angehängt oder verkettet.

`boxlang.json`/`boxlang-{env}.json`/`miniserver.json`/`miniserver-{env}.json` sind allesamt optionale JSON-Dateien im Projekt-Root, nützlich für Konfiguration, die sich leichter als Daten denn als BoxLang-Code ausdrücken lässt (z. B. Modell-Standardwerte):

```json
// boxlang.json
{
	"modelDefaults": { "temperature": 0.7, "maxTokens": 1000 }
}
```

```json
// boxlang-production.json
{
	"modelDefaults": { "temperature": 0.2 }
}
```

Ein Build mit `--environment=production` ergibt hier `modelDefaults: { temperature: 0.2, maxTokens: 1000 }` - das rekursive Merge behielt `maxTokens` aus der Basisdatei, da `boxlang-production.json` es nie erwähnte.

!!! warning
    Secrets (API-Schlüssel, Tokens) werden von BxAgents zur Build-Zeit nie gelesen oder gemergt - sie bleiben extern (eine OS-Umgebungsvariable, `.env`, ein Plattform-Secret-Manager) und werden von bx-ai selbst live zur Laufzeit aufgelöst. Siehe [Deployment & Secrets](../deployment-and-secrets.md).
