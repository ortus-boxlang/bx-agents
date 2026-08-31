---
title: "gateways/ - Microsoft Teams"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, teams]
---

# Microsoft Teams

Teil der Push-Style-[gateways/](index.md)-Familie - dort werden die gemeinsame Regel "Secrets bleiben extern", `GatewaySession`, und der Scheduler erklärt, unter dem diese Gateways laufen. Diese Seite behandelt Microsoft Teamss eigene Config-Form und (wo BxAgents etwas Plattform-Spezifisches tut) wie sie mit Microsoft Teams kommuniziert.

```javascript
// gateways/teamsChannel.bx
class {
	function configure() {
		return {
			type                : "teams",
			appIdEnvVar         : "TEAMS_APP_ID",         // the bot's own Microsoft App ID (also the inbound JWT's required aud claim)
			appPasswordEnvVar   : "TEAMS_APP_PASSWORD"    // OAuth2 client-credentials secret
			// tenantId: "..."   // optional override for single-tenant apps - defaults to "botframework.com" (multi-tenant)
		};
	}
}
```

`type: "teams"` erfordert `appIdEnvVar` und `appPasswordEnvVar`. Wird auf dieselbe Weise geprüft wie der `secretEnvVar` eines Channel-Adapter-`http`-Eintrags.

Generierte Registrierungsanweisung:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.TeamsGateway", { "appId" : getSystemSetting( "TEAMS_APP_ID", "" ), "appPassword" : getSystemSetting( "TEAMS_APP_PASSWORD", "" ) } ) )
```

## Microsoft Teams - Bot-Framework-Activity-Protokoll

`TeamsGateway` ist Webhook-getrieben, auf dieselbe Weise wie `WhatsAppCloudGateway` - es erweitert `BaseGateway` direkt, und Microsofts eigener Bot-Connector-Dienst ruft **uns** an, über eine einzelne generierte Route:

```javascript
post( "/webhooks/teams" ).toHandler( "Teams.process" )
```

Anders als bei WhatsApp Cloud gibt es keinen GET-Verify-Handshake (das Bot Framework hat kein Äquivalent zu Metas `hub.challenge`) - jede eingehende Activity kommt als signiertes POST an, verifiziert über ein **Bearer-JWT** im `Authorization`-Header statt über eine HMAC-Signatur über den Body. Das JWT wird gegen die eigene JWKS des Bot Connectors geprüft (`https://login.botframework.com/v1/.well-known/openidconfiguration` → dessen `jwks_uri`) - RS256-Signatur, `aud` muss der eigenen konfigurierten `appId` des Bots entsprechen, `iss` muss dem festen Aussteller-String des Bot Connectors entsprechen (`https://api.botframework.com`), beides mit einer 5-Minuten-Uhrabweichungstoleranz. Das ist echte RSA-/JWT-Verifikation, aufgebaut aus BoxLangs eigener Java-Interop (`java.security.Signature`, `java.security.KeyFactory`, `java.math.BigInteger`) - keine externe JWT-Bibliothek. Ausgehende Aufrufe nutzen ein separates OAuth2-Client-Credentials-Token (abgerufen von `login.microsoftonline.com/{tenantId}/oauth2/v2.0/token`, gecacht und 60s vor dem angegebenen Ablauf neu abgerufen).

Portiert aus [Vercel Eves](https://github.com/vercel/eve) echtem Teams-Kanal (`packages/eve/src/public/channels/teams/`, MIT-lizenziert) - der OAuth2-Ablauf, das JWT-Verifikationsschema, das REST-Tripel `v3/conversations/{id}/activities[/{activityId}]` und die Adaptive-Card-Human-in-the-Loop-Form (Schema 1.5, ein `Action.Submit`-Button pro erlaubter Entscheidung) spiegeln alle diese Implementierung. **Hermes Agents eigenes `msgraph_webhook.py` ist trotz des ähnlichen "Microsoft-Webhook"-Namens unabhängig davon** - es implementiert Microsoft-Graph-*Change-Notification*-Webhooks (Postfach-/Laufwerk-/Listen-Ressourcenänderungs-Events, eine andere Microsoft-Produktoberfläche ganz ohne funktionierendes ausgehendes Teams-Messaging) und nichts daraus wurde hierher portiert.

!!! warning
    v1-Umfang ist **nur persönliche (1:1-DM-)Konversationen** - Gruppenchats und kanalweite Nachrichten brauchen Bot-Mention-Gating und ein anderes Reply-Threading-Modell, das Eve selbst implementiert, dieser Port aber nicht, passend zum eigenen DM-first-v1-Umfang jedes anderen Push-Style-Gateways. Es wird eine Nachrichten-Chunk-Grenze von 4000 Zeichen genutzt (Eves eigene Adaptive-Card-Text-Truncation-Konstante) statt der echten 80-KiB-Grenze des Bot-Framework-Protokolls, aus Gründen der UI-Lesbarkeit.

!!! info
    Die Bot-Connector-JWKS wird einmal abgerufen und für die Lebensdauer der Gateway-Instanz gecacht - falls Microsoft je seine Signierschlüssel rotiert, ohne dass eine passende `kid` bereits gecacht ist, würde die Verifikation zu scheitern beginnen, bis das Gateway (und damit die ganze App) neu startet. Für v1 ist keine periodische Cache-Invalidierung gebaut. Die JWT-Verifikationslogik selbst wurde in dieser Session empirisch gegen ein echtes, lokal generiertes RSA-Schlüsselpaar und handsignierte Test-JWTs verifiziert (gültige Signatur akzeptiert, manipulierte Signatur/falsche Audience/abgelaufenes Token alle mit 401 abgelehnt) - nicht nur gegen Eves Quellcode gelesen.
