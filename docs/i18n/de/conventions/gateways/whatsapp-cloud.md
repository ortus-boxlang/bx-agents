---
title: "gateways/ - WhatsApp Business Cloud"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, whatsappcloud]
---

# WhatsApp Business Cloud

Teil der Push-Style-[gateways/](index.md)-Familie - dort werden die gemeinsame Regel "Secrets bleiben extern", `GatewaySession`, und der Scheduler erklärt, unter dem diese Gateways laufen. Diese Seite behandelt WhatsApp Business Clouds eigene Config-Form und (wo BxAgents etwas Plattform-Spezifisches tut) wie sie mit WhatsApp Business Cloud kommuniziert.

```javascript
// gateways/whatsappCloud.bx
class {
	function configure() {
		return {
			type               : "whatsapp-cloud",
			accessTokenEnvVar  : "WHATSAPP_ACCESS_TOKEN",     // Graph API access token
			phoneNumberIdEnvVar: "WHATSAPP_PHONE_NUMBER_ID",  // the WhatsApp Business phone number ID sends go through
			appSecretEnvVar    : "WHATSAPP_APP_SECRET",       // HMAC key verifying X-Hub-Signature-256 on inbound webhooks
			verifyTokenEnvVar  : "WHATSAPP_VERIFY_TOKEN"      // shared secret Meta's GET verify handshake must echo back
			// apiVersion: "v21.0"   // optional override - defaults to "v21.0"
		};
	}
}
```

`type: "whatsapp-cloud"` erfordert `accessTokenEnvVar`, `phoneNumberIdEnvVar`, `appSecretEnvVar` und `verifyTokenEnvVar`. Wird auf dieselbe Weise geprüft wie der `secretEnvVar` eines Channel-Adapter-`http`-Eintrags.

Generierte Registrierungsanweisung:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.whatsapp.WhatsAppCloudGateway", { "accessToken" : getSystemSetting( "WHATSAPP_ACCESS_TOKEN", "" ), "phoneNumberId" : getSystemSetting( "WHATSAPP_PHONE_NUMBER_ID", "" ), "appSecret" : getSystemSetting( "WHATSAPP_APP_SECRET", "" ), "verifyToken" : getSystemSetting( "WHATSAPP_VERIFY_TOKEN", "" ) } ) )
```

## WhatsApp Business Cloud API - Webhook-getrieben, nicht verbindungsgetrieben

`WhatsAppCloudGateway` ist anders geformt als jedes andere Push-Style-Gateway: Meta ruft **uns** an, über einen öffentlichen Webhook, statt dass dieses Gateway seine eigene ausgehende Verbindung hält (ein Poll-Task oder ein Websocket). Es erweitert bx-ais `BaseGateway` direkt, nicht `ScheduledGatewayBase` - es gibt keinen Scheduler-Task oder Socket zu verwalten, nur ein generiertes `handlers/WhatsAppCloud.bx` (geschrieben, wann immer ein `whatsapp-cloud`-Gateway-Eintrag existiert), verdrahtet mit zwei festen Routen:

```javascript
get( "/webhooks/whatsapp-cloud" ).toHandler( "WhatsAppCloud.verify" )
post( "/webhooks/whatsapp-cloud" ).toHandler( "WhatsAppCloud.process" )
```

Beide Actions sind dünne Passthroughs in die eigenen `handleVerify()`/`handleWebhook()` des Gateways - `verify` beantwortet Metas Abo-Handshake (`GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`, echot die Challenge nur als reinen Text zurück, wenn Modus und Token übereinstimmen, zeitkonstant verglichen); `process` verifiziert Metas eigenen `X-Hub-Signature-256`-Header (HMAC-SHA256 über den **exakten rohen POST-Body** - `event.getHTTPContent()`, nie erneut geparstes/serialisiertes JSON, was die Bytes ändern und die Signatur brechen würde), bevor irgendetwas geparst oder dispatcht wird. Das ist ein genuin anderes Schema als bx-ais eigenes `HttpGateway`/`GatewaySecurity` (andere Header-Namen, andere HMAC-Konstruktion), es wird hier also nicht wiederverwendet - siehe den eigenen Docblock der Klasse.

Direkt portiert aus [Hermes Agents](https://github.com/NousResearch/hermes-agent) eigenem echtem, produktivem WhatsApp-Cloud-Adapter (`gateway/platforms/whatsapp_cloud.py`, MIT-lizenziert) - der Verify-Handshake, das Signaturschema, der Webhook-Payload-Walk (`entry[].changes[].value.{messages,contacts}`), die ausgehenden Nachrichten-/Interactive-Button-Formen (≤3 erlaubte Entscheidungen werden als native Buttons gerendert, 4+ als tippe-zum-Öffnen-Liste, passend zu WhatsApps eigenen dokumentierten Grenzen) und die Längenbegrenzungen (4096-Zeichen-Nachrichten, 20-Zeichen-Button-Labels, 1024-Zeichen-Interactive-Body-Text) wurden alle in dieser Session direkt aus jener Quelle gelesen, nicht von Grund auf neu implementiert. Eingehende Nachrichten werden anhand ihrer eigenen `wamid` dedupliziert (Meta wiederholt die Webhook-Zustellung bei jeder Nicht-200-Antwort bis zu 7 Tage lang) über einen begrenzten FIFO-Cache, gespiegelt an Hermes' eigenem `_dedup_wamid`.

!!! warning
    v1-Umfang, passend zu Hermes' eigener dokumentierter Einschränkung: Cloud-API-DMs haben keine separate "Chat"-Entität - `chat_id` IST die `wa_id` des Absenders - und Gruppennachrichten (die ein eigenes `chat`-Feld tragen, das die Gruppen-JID identifiziert) sind außerhalb des Umfangs; Medien (Bild/Video/Dokument/Audio) werden nicht heruntergeladen, nur eine Beschriftung, falls vorhanden. Jedes andere Push-Style-Gateway teilt dieselbe oben dokumentierte Eine-Instanz-pro-Typ-Registry-Obergrenze - `whatsapp-cloud` bildet keine Ausnahme.

!!! info
    Die eigenen ColdBox-Request-Context-Aufrufe des generierten `handlers/WhatsAppCloud.bx` (`event.getHTTPContent()`/`event.getHTTPHeader()`/`event.renderData()`, `rc`s über das URL-Scope gemergte Query-Parameter für den GET-Handshake) sind die dokumentierten, standardmäßigen ColdBox-REST-Handler-Idiome - aber anders als die eigene Signatur-/Dispatch-Logik des Gateways (in dieser Session gründlich unit-getestet und empirisch gegen echtes HMAC-/JSON-Verhalten verifiziert), wurde diese spezifische generierte Routen-Verdrahtung NICHT gegen einen echten ColdBox-Boot geprüft. Siehe known-limitations.md.

**Es gibt keinen Typ `"whatsapp-personal"`.** Die inoffizielle persönliche Konto-Bridge (WhatsApps Multi-Device-Web-Protokoll, die Art, wie Hermes Agent sie über einen Node.js-/Baileys-Subprozess erreicht) wurde recherchiert, aber bewusst nicht gebaut - die eine MIT-lizenzierte native Java-Option (Cobalt, `com.github.auties00:cobalt`) zog sich in der tatsächlich auf Maven Central veröffentlichten Version eine kommerzielle/proprietäre Abhängigkeit (`com.aspose:aspose-words`) hinein, und ein Subprozess-Bridge-Port wurde zugunsten eines nativen JVM-Ansatzes zurückgestellt. Wird `type: "whatsapp-personal"` in einem `gateways/*`-Eintrag deklariert, schlägt die Validierung mit einem "unbekannter Typ"-Fehler fehl, wie bei jedem anderen nicht unterstützten Typ. Siehe `docs/known-limitations.md` für die vollständige Untersuchung.
