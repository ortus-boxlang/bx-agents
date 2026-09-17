---
title: "gateways/ - GitHub"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, github]
---

# GitHub

Parte de la familia de gateways de estilo push [gateways/](index.md) - allí se explica la regla compartida de que "los secretos permanecen externos", `GatewaySession`, y el scheduler bajo el que se ejecutan estos gateways. Esta página cubre la forma de configuración propia de GitHub y (cuando BxAgents hace algo específico de la plataforma) cómo se comunica con GitHub.

```javascript
// gateways/githubChannel.bx
class {
	function configure() {
		return {
			type               : "github",
			tokenEnvVar        : "GITHUB_TOKEN",           // un token de acceso personal (scope de lectura+escritura de repo/issues+PR)
			webhookSecretEnvVar: "GITHUB_WEBHOOK_SECRET",  // clave HMAC que verifica X-Hub-Signature-256 en webhooks entrantes
			botNameEnvVar      : "GITHUB_BOT_NAME"         // el propio login de GitHub del bot - coincidido como "@botName" en comentarios
			// apiBaseUrl: "https://api.github.com"   // override opcional - por defecto "https://api.github.com"
		};
	}
}
```

`type: "github"` requiere `tokenEnvVar`, `webhookSecretEnvVar`, y `botNameEnvVar`. Comprobado de la misma manera que el `secretEnvVar` de una entrada channel-adapter `http`.

Sentencia de registro generada:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.GitHubGateway", { "token" : getSystemSetting( "GITHUB_TOKEN", "" ), "webhookSecret" : getSystemSetting( "GITHUB_WEBHOOK_SECRET", "" ), "botName" : getSystemSetting( "GITHUB_BOT_NAME", "" ) } ) )
```

## GitHub - hilos de comentario de issue/PR con compuerta de `@mention`

`GitHubGateway` trata cada issue, PR, o hilo de comentario de review en línea como una conversación de chat - el agente responde cuando explícitamente se le hace `@mention` en un comentario, y responde publicando un nuevo comentario de vuelta al mismo hilo. Impulsado por webhook de la misma manera que cada otro gateway en esta sección:

```javascript
post( "/webhooks/github" ).toHandler( "GitHub.process" )
```

Portado desde el propio canal real de GitHub de Vercel Eve (`packages/eve/src/public/channels/github/`, licenciado MIT) - la verificación de `X-Hub-Signature-256` se confirma como la construcción **idéntica** al propio esquema de Meta de WhatsApp Cloud (HMAC-SHA256 sobre el cuerpo crudo, hex, prefijo `sha256=`) - el único gateway de webhook en este proyecto que reutiliza el algoritmo de firma exacto de otro, en lugar de necesitar el suyo propio. Solo se despachan los eventos `issue_comment` y `pull_request_review_comment` con `action: "created"` (coincidiendo con los propios tipos de evento manejados-por-defecto de Eve - `issues`/`pull_request`/`check_suite`/`check_run`/`workflow_run` tampoco tienen despacho por defecto en Eve, y no se conectan aquí); cada otro tipo de evento se reconoce (200) pero se ignora, para evitar el comportamiento de reintento/deshabilitar-hook-en-fallo de GitHub para eventos sobre los que este gateway no actúa.

**La compuerta de despacho es un requisito genuino de `@mention`**, portado desde el propio `extractGitHubCommentTrigger()` de Eve: un comentario solo alcanza al agente si contiene `@<botName>` seguido de fin-de-cadena o un carácter no identificador (así que un bot llamado `mybot` nunca se dispara en un comentario que menciona `@mybot2`) - confirmado vía una prueba de humo de regex-lookahead real esta sesión antes de confiar en ello. El token `@mention` coincidente se elimina del texto antes de que llegue al agente. La prevención de bucle de bot refleja la propia protección de tres partes de Eve: cualquier comentario cuyo autor tenga el propio `type: "Bot"` de GitHub, cuyo login coincida con `{botName}[bot]`, o cuyo cuerpo contenga el propio marcador `<!-- bxagents:posted -->` de este gateway (añadido a cada comentario que publica) se ignora por completo, incluso si resulta contener una mención.

Una "conversación" se identifica por una de dos formas, coincidiendo con el propio modelo de Eve: `repo:{owner}/{repo}:issue:{issueNumber}` para un hilo de comentario de issue/PR ordinario, o `repo:{owner}/{repo}:review-comment:{reviewThreadRootCommentId}` para un hilo de comentario de review de PR en línea - las respuestas a un hilo de review siempre van al comentario **raíz del hilo** (`comment.in_reply_to_id ?? comment.id`), no al comentario específico al que se responde, así que un ida y vuelta multi-mensaje permanece un solo hilo. Las respuestas salientes hacen POST a `repos/{owner}/{repo}/issues/{issueNumber}/comments` (hilos ordinarios) o `repos/{owner}/{repo}/pulls/{pullRequestNumber}/comments/{reviewCommentId}/replies` (hilos de review).

!!! info
    v1 auth es un token de acceso personal simple (`tokenEnvVar`), no el propio flujo de GitHub App JWT + token de instalación de Eve - más simple y más directamente portable para un primer corte (Eve mismo soporta un bypass de token pre-resuelto exactamente por esta razón, que es en lo que esto se mapea). Un futuro modo de GitHub App es una extensión natural, no construida aquí. A diferencia de Eve (que no tiene deduplicación de id de entrega en absoluto, confirmado ausente leyendo su código fuente), `GitHubGateway` deduplica por `X-GitHub-Delivery` vía una caché FIFO acotada, coincidiendo con la propia disciplina de deduplicación de `wamid` de WhatsApp Cloud.

!!! warning
    No se portó ningún checkout de repo/edición de código (el propio `checkout.ts` de Eve, que clona el repo en un sandbox para que el agente pueda leer/editar código) - esta es solo una superficie de chat de comentario-entrada/comentario-salida. El human-in-the-loop está degradado de la misma manera que el de Twilio (sin capacidad nativa de botón/tarjeta) - `requestHumanInteraction()` publica un comentario pidiéndole al humano que haga `@mention` al bot de nuevo en una respuesta con una de las decisiones permitidas, correlacionado por conversationID (no por una etiqueta por solicitud), la misma simplificación v1 que usa el propio respaldo HITL de Twilio.
