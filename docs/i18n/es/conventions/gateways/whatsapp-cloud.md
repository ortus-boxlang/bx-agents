---
title: "gateways/ - WhatsApp Business Cloud"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, whatsappcloud]
---

# WhatsApp Business Cloud

Parte de la familia de gateways de estilo push [gateways/](index.md) - allí se explica la regla compartida de que "los secretos permanecen externos", `GatewaySession`, y el scheduler bajo el que se ejecutan estos gateways. Esta página cubre la forma de configuración propia de WhatsApp Business Cloud y (cuando BxAgents hace algo específico de la plataforma) cómo se comunica con WhatsApp Business Cloud.

```javascript
// gateways/whatsappCloud.bx
class {
	function configure() {
		return {
			type               : "whatsapp-cloud",
			accessTokenEnvVar  : "WHATSAPP_ACCESS_TOKEN",     // token de acceso de la API de Graph
			phoneNumberIdEnvVar: "WHATSAPP_PHONE_NUMBER_ID",  // el ID del número de teléfono de WhatsApp Business por el que pasan los envíos
			appSecretEnvVar    : "WHATSAPP_APP_SECRET",       // clave HMAC que verifica X-Hub-Signature-256 en webhooks entrantes
			verifyTokenEnvVar  : "WHATSAPP_VERIFY_TOKEN"      // secreto compartido que el handshake GET de verificación de Meta debe devolver
			// apiVersion: "v21.0"   // override opcional - por defecto "v21.0"
		};
	}
}
```

`type: "whatsapp-cloud"` requiere `accessTokenEnvVar`, `phoneNumberIdEnvVar`, `appSecretEnvVar`, y `verifyTokenEnvVar`. Comprobado de la misma manera que el `secretEnvVar` de una entrada channel-adapter `http`.

Sentencia de registro generada:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.whatsapp.WhatsAppCloudGateway", { "accessToken" : getSystemSetting( "WHATSAPP_ACCESS_TOKEN", "" ), "phoneNumberId" : getSystemSetting( "WHATSAPP_PHONE_NUMBER_ID", "" ), "appSecret" : getSystemSetting( "WHATSAPP_APP_SECRET", "" ), "verifyToken" : getSystemSetting( "WHATSAPP_VERIFY_TOKEN", "" ) } ) )
```

## WhatsApp Business Cloud API - impulsado por webhook, no por conexión

`WhatsAppCloudGateway` está moldeado de forma diferente a cada otro gateway de estilo push: Meta nos llama **a nosotros**, a través de un webhook público, en lugar de que este gateway mantenga su propia conexión saliente (una tarea de poll o un websocket). Extiende `BaseGateway` de bx-ai directamente, no `ScheduledGatewayBase` - no hay tarea de scheduler ni socket que gestionar, solo un `handlers/WhatsAppCloud.bx` generado (escrito siempre que existe una entrada de gateway `whatsapp-cloud`) conectado a dos rutas fijas:

```javascript
get( "/webhooks/whatsapp-cloud" ).toHandler( "WhatsAppCloud.verify" )
post( "/webhooks/whatsapp-cloud" ).toHandler( "WhatsAppCloud.process" )
```

Ambas acciones son passthroughs delgados hacia los propios `handleVerify()`/`handleWebhook()` del gateway - `verify` responde al handshake de suscripción de Meta (`GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`, devolviendo el challenge como texto plano solo cuando el modo y el token coinciden, comparados en tiempo constante); `process` verifica la propia cabecera `X-Hub-Signature-256` de Meta (HMAC-SHA256 sobre el **cuerpo POST crudo exacto** - `event.getHTTPContent()`, nunca JSON re-analizado/re-serializado, lo que cambiaría los bytes y rompería la firma) antes de analizar o despachar nada. Este es un esquema genuinamente diferente al propio `HttpGateway`/`GatewaySecurity` de bx-ai (nombres de cabecera diferentes, construcción HMAC diferente), así que no se reutiliza aquí - ver el propio docblock de la clase.

Portado directamente desde el propio adaptador real y de producción de WhatsApp Cloud de [Hermes Agent](https://github.com/NousResearch/hermes-agent) (`gateway/platforms/whatsapp_cloud.py`, licenciado MIT) - el handshake de verificación, el esquema de firma, el recorrido del payload de webhook (`entry[].changes[].value.{messages,contacts}`), las formas de mensaje saliente/botón interactivo (≤3 decisiones permitidas se renderizan como botones nativos, 4+ como una lista de tap-to-open, coincidiendo con los propios límites documentados de WhatsApp), y los límites de longitud (mensajes de 4096 caracteres, etiquetas de botón de 20 caracteres, texto de cuerpo interactivo de 1024 caracteres) se leyeron todos directamente de ese código fuente esta sesión, no reimplementados desde cero. Los mensajes entrantes se deduplican por su propio `wamid` (Meta reintenta la entrega de webhook en cualquier respuesta que no sea 200 hasta por 7 días) vía una caché FIFO acotada, reflejando el propio `_dedup_wamid` de Hermes.

!!! warning
    Alcance de v1, coincidiendo con la propia limitación documentada de Hermes: los DMs de Cloud API no tienen una entidad "chat" separada - `chat_id` ES el `wa_id` del remitente - y los mensajes de grupo (que llevan su propio campo `chat` identificando el JID del grupo) están fuera de alcance; los medios (imagen/video/documento/audio) no se descargan, solo una leyenda si está presente. Cada otro gateway de estilo push comparte el mismo techo de registro de una-instancia-por-tipo documentado arriba - `whatsapp-cloud` no es la excepción.

!!! info
    Las propias llamadas de contexto de request de ColdBox del `handlers/WhatsAppCloud.bx` generado (`event.getHTTPContent()`/`event.getHTTPHeader()`/`event.renderData()`, los parámetros de query fusionados en el scope URL de `rc` para el handshake GET) son los idiomas documentados y estándar de handler REST de ColdBox - pero a diferencia de la propia lógica de firma/despacho del gateway (probada unitariamente de forma exhaustiva y verificada empíricamente contra comportamiento HMAC/JSON real esta sesión), este cableado de ruta generada específico NO se ha ejercitado contra un arranque real de ColdBox. Ver limitaciones conocidas.

**No hay ningún tipo `"whatsapp-personal"`.** El puente no oficial de cuenta personal (el protocolo Web multi-dispositivo de WhatsApp, el tipo que Hermes Agent alcanza vía un subproceso de Node.js/Baileys) se investigó pero deliberadamente no se construyó - la única opción nativa de Java licenciada MIT (Cobalt, `com.github.auties00:cobalt`) resultó traer una dependencia comercial/propietaria (`com.aspose:aspose-words`) en la versión realmente publicada en Maven Central, y un port de puente de subproceso se dejó de lado a favor de un enfoque nativo de JVM. Declarar `type: "whatsapp-personal"` en una entrada `gateways/*` falla la validación con un error de "tipo desconocido", igual que cualquier otro tipo no soportado. Ver `docs/known-limitations.md` para la investigación completa.
