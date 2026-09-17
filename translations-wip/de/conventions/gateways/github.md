---
title: "gateways/ - GitHub"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, github]
---

# GitHub

Teil der Push-Style-[gateways/](index.md)-Familie - dort werden die gemeinsame Regel "Secrets bleiben extern", `GatewaySession`, und der Scheduler erklärt, unter dem diese Gateways laufen. Diese Seite behandelt GitHubs eigene Config-Form und (wo BxAgents etwas Plattform-Spezifisches tut) wie sie mit GitHub kommuniziert.

```javascript
// gateways/githubChannel.bx
class {
	function configure() {
		return {
			type               : "github",
			tokenEnvVar        : "GITHUB_TOKEN",           // a personal access token (repo/issues+PR read+write scope)
			webhookSecretEnvVar: "GITHUB_WEBHOOK_SECRET",  // HMAC key verifying X-Hub-Signature-256 on inbound webhooks
			botNameEnvVar      : "GITHUB_BOT_NAME"         // the bot's own GitHub login - matched as "@botName" in comments
			// apiBaseUrl: "https://api.github.com"   // optional override - defaults to "https://api.github.com"
		};
	}
}
```

`type: "github"` erfordert `tokenEnvVar`, `webhookSecretEnvVar` und `botNameEnvVar`. Wird auf dieselbe Weise geprüft wie der `secretEnvVar` eines Channel-Adapter-`http`-Eintrags.

Generierte Registrierungsanweisung:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.GitHubGateway", { "token" : getSystemSetting( "GITHUB_TOKEN", "" ), "webhookSecret" : getSystemSetting( "GITHUB_WEBHOOK_SECRET", "" ), "botName" : getSystemSetting( "GITHUB_BOT_NAME", "" ) } ) )
```

## GitHub - über `@mention` geschützte Issue-/PR-Kommentar-Threads

`GitHubGateway` behandelt jedes Issue, jede PR oder jeden Inline-Review-Kommentar-Thread als Chat-Konversation - der Agent antwortet, wenn er in einem Kommentar explizit per `@mention` erwähnt wird, und antwortet, indem er einen neuen Kommentar in denselben Thread postet. Webhook-getrieben, auf dieselbe Weise wie jedes andere Gateway in diesem Abschnitt:

```javascript
post( "/webhooks/github" ).toHandler( "GitHub.process" )
```

Portiert aus Vercel Eves echtem GitHub-Kanal (`packages/eve/src/public/channels/github/`, MIT-lizenziert) - die `X-Hub-Signature-256`-Verifikation ist bestätigt die **identische Konstruktion** wie Metas eigenes WhatsApp-Cloud-Schema (HMAC-SHA256 über den rohen Body, hex, `sha256=`-Präfix) - das einzige Webhook-Gateway in diesem Projekt, das den exakten Signaturalgorithmus eines anderen wiederverwendet, statt einen eigenen zu brauchen. Nur `issue_comment`- und `pull_request_review_comment`-Events mit `action: "created"` werden dispatcht (passend zu Eves eigenen ausschließlich standardmäßig behandelten Event-Arten - `issues`/`pull_request`/`check_suite`/`check_run`/`workflow_run` haben auch bei Eve keinen Standard-Dispatch und sind hier nicht verdrahtet); jede andere Event-Art wird bestätigt (200), aber ignoriert, um GitHubs Retry-/Hook-bei-Fehler-deaktivieren-Verhalten für Events zu vermeiden, auf die dieses Gateway nicht reagiert.

**Das Dispatch-Gate ist eine echte `@mention`-Anforderung**, portiert aus Eves eigenem `extractGitHubCommentTrigger()`: Ein Kommentar erreicht den Agenten nur, wenn er `@<botName>` gefolgt von Stringende oder einem Nicht-Identifier-Zeichen enthält (ein Bot namens `mybot` feuert also nie bei einem Kommentar, der `@mybot2` erwähnt) - in dieser Session über einen echten Regex-Lookahead-Smoke-Test bestätigt, bevor dem vertraut wurde. Das gematchte `@mention`-Token wird aus dem Text entfernt, bevor er den Agenten erreicht. Bot-Loop-Verhinderung spiegelt Eves eigenen dreiteiligen Schutz: Jeder Kommentar, dessen Autor GitHubs eigenen `type: "Bot"` hat, dessen Login zu `{botName}[bot]` passt, oder dessen Body den eigenen Marker `<!-- bxagents:posted -->` dieses Gateways enthält (an jeden von ihm geposteten Kommentar angehängt), wird von vornherein ignoriert, selbst wenn er zufällig eine Mention enthält.

Eine "Konversation" wird durch eine von zwei Formen identifiziert, passend zu Eves eigenem Modell: `repo:{owner}/{repo}:issue:{issueNumber}` für einen gewöhnlichen Issue-/PR-Kommentar-Thread, oder `repo:{owner}/{repo}:review-comment:{reviewThreadRootCommentId}` für einen Inline-PR-Review-Kommentar-Thread - Antworten auf einen Review-Thread gehen immer an den **Thread-Root**-Kommentar (`comment.in_reply_to_id ?? comment.id`), nicht an den konkreten Kommentar, auf den geantwortet wird, sodass ein Mehrfach-Nachrichten-Hin-und-her ein Thread bleibt. Ausgehende Antworten posten an `repos/{owner}/{repo}/issues/{issueNumber}/comments` (gewöhnliche Threads) oder `repos/{owner}/{repo}/pulls/{pullRequestNumber}/comments/{reviewCommentId}/replies` (Review-Threads).

!!! info
    v1-Auth ist ein einfaches Personal-Access-Token (`tokenEnvVar`), nicht Eves eigener GitHub-App-JWT-+-Installations-Token-Ablauf - einfacher und direkter portierbar für einen ersten Wurf (Eve selbst unterstützt einen Bypass mit vorab aufgelöstem Token, genau dafür - genau das ist es, worauf das hier abbildet). Ein zukünftiger GitHub-App-Modus ist eine natürliche Erweiterung, hier nicht gebaut. Anders als Eve (das gar kein Delivery-ID-Dedup hat, durch Lesen seines Quellcodes als fehlend bestätigt), dedupliziert `GitHubGateway` per `X-GitHub-Delivery` über einen begrenzten FIFO-Cache, passend zu WhatsApp Clouds eigener `wamid`-Dedup-Disziplin.

!!! warning
    Kein Repo-Checkout/Code-Editing (Eves eigenes `checkout.ts`, das das Repo in eine Sandbox klont, damit der Agent Code lesen/bearbeiten kann) wurde portiert - dies ist nur eine Kommentar-rein-Kommentar-raus-Chat-Oberfläche. Human-in-the-Loop ist auf dieselbe Weise verschlechtert wie bei Twilio (keine native Button-/Karten-Affordanz) - `requestHumanInteraction()` postet einen Kommentar, der den Menschen bittet, den Bot in einer Antwort mit einer der erlaubten Entscheidungen erneut per `@mention` zu erwähnen, korreliert nach conversationID (kein Tag pro Request), dieselbe v1-Vereinfachung, die auch Twilios eigener HITL-Fallback nutzt.
