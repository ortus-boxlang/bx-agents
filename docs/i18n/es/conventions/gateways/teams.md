---
title: "gateways/ - Microsoft Teams"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, teams]
---

# Microsoft Teams

Parte de la familia de gateways de estilo push [gateways/](index.md) - allí se explica la regla compartida de que "los secretos permanecen externos", `GatewaySession`, y el scheduler bajo el que se ejecutan estos gateways. Esta página cubre la forma de configuración propia de Microsoft Teams y (cuando BxAgents hace algo específico de la plataforma) cómo se comunica con Microsoft Teams.

```javascript
// gateways/teamsChannel.bx
class {
	function configure() {
		return {
			type                : "teams",
			appIdEnvVar         : "TEAMS_APP_ID",         // el propio Microsoft App ID del bot (también el claim aud requerido del JWT entrante)
			appPasswordEnvVar   : "TEAMS_APP_PASSWORD"    // secreto de cliente OAuth2 client-credentials
			// tenantId: "..."   // override opcional para apps de un solo tenant - por defecto "botframework.com" (multi-tenant)
		};
	}
}
```

`type: "teams"` requiere `appIdEnvVar` y `appPasswordEnvVar`. Comprobado de la misma manera que el `secretEnvVar` de una entrada channel-adapter `http`.

Sentencia de registro generada:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.TeamsGateway", { "appId" : getSystemSetting( "TEAMS_APP_ID", "" ), "appPassword" : getSystemSetting( "TEAMS_APP_PASSWORD", "" ) } ) )
```

## Microsoft Teams - protocolo Activity de Bot Framework

`TeamsGateway` es impulsado por webhook de la misma manera que `WhatsAppCloudGateway` - extiende `BaseGateway` directamente, y el propio servicio Bot Connector de Microsoft nos llama **a nosotros**, sobre una sola ruta generada:

```javascript
post( "/webhooks/teams" ).toHandler( "Teams.process" )
```

A diferencia de WhatsApp Cloud no hay handshake GET de verificación (Bot Framework no tiene equivalente del `hub.challenge` de Meta) - cada actividad entrante llega como un POST firmado, verificado vía un **JWT bearer** en la cabecera `Authorization` en lugar de una firma HMAC sobre el cuerpo. El JWT se comprueba contra el propio JWKS de Bot Connector (`https://login.botframework.com/v1/.well-known/openidconfiguration` → su `jwks_uri`) - firma RS256, `aud` debe ser igual al propio `appId` configurado del bot, `iss` debe ser igual a la cadena de emisor fija de Bot Connector (`https://api.botframework.com`), ambos con una tolerancia de desfase de reloj de 5 minutos. Esta es verificación RSA/JWT genuina construida a partir de la propia interoperabilidad Java de BoxLang (`java.security.Signature`, `java.security.KeyFactory`, `java.math.BigInteger`) - sin biblioteca externa de JWT. Las llamadas salientes usan un token OAuth2 client-credentials separado (obtenido de `login.microsoftonline.com/{tenantId}/oauth2/v2.0/token`, cacheado y reobtenido 60s antes de su expiración declarada).

Portado desde el propio canal real de Teams de [Vercel Eve](https://github.com/vercel/eve) (`packages/eve/src/public/channels/teams/`, licenciado MIT) - el flujo OAuth2, el esquema de verificación de JWT, la tríada REST `v3/conversations/{id}/activities[/{activityId}]`, y la forma human-in-the-loop de Adaptive Card (esquema 1.5, un botón `Action.Submit` por decisión permitida) todos reflejan esa implementación. **El propio `msgraph_webhook.py` de Hermes Agent no está relacionado** a pesar del nombramiento similar de "webhook de Microsoft" - implementa webhooks de *notificación de cambio* de Microsoft Graph (eventos de cambio de recurso de buzón/unidad/lista, una superficie de producto de Microsoft diferente sin ninguna mensajería saliente de Teams funcional en absoluto) y nada de él se portó aquí.

!!! warning
    El alcance de v1 es **solo conversaciones personales (DM 1:1)** - el chat grupal y los mensajes de todo el canal necesitan una compuerta de mención de bot y un modelo de enhebrado de respuesta diferente que Eve mismo implementa pero este port no - coincidiendo con el propio alcance v1 de solo-DM de cada otro gateway de estilo push. Se usa un límite de fragmento de mensaje de 4000 caracteres (la propia constante de truncamiento de texto de Adaptive Card de Eve) en lugar del verdadero techo de 80 KiB del protocolo de Bot Framework, por legibilidad de UI.

!!! info
    El JWKS de Bot Connector se obtiene una vez y se cachea por la vida de la instancia del gateway - si Microsoft alguna vez rota sus claves de firma sin un `kid` coincidente ya cacheado, la verificación empezaría a fallar hasta que el gateway (y por lo tanto toda la app) se reinicie. No hay invalidación periódica de caché construida para v1. La propia lógica de verificación de JWT se verificó empíricamente esta sesión contra un par de claves RSA real y generado localmente y JWTs de prueba firmados a mano (firma válida aceptada, firma manipulada/audiencia incorrecta/token expirado todos rechazados con 401) - no solo leída contra el código fuente de Eve.
