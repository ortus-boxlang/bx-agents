---
title: El pipeline de build
icon: phosphor-duotone:factory
summary: La secuencia fija de fases que convierte un proyecto en una aplicación ColdBox.
description: La secuencia fija de fases que convierte un proyecto en una aplicación ColdBox.
tags: [reference, build]
---

# El pipeline de build

`bxAgents build` ejecuta una secuencia fija de fases, una vez, produciendo una aplicación ColdBox normal. Nada de esto se vuelve a ejecutar en tiempo de request - ese es todo el sentido del ensamblaje en tiempo de build. Esta página recorre las fases en el orden exacto en que `BuildPipeline.bx` las ejecuta.

```mermaid
flowchart TD
    A["1 · Resolver config<br/><small>AgentConfigResolver</small>"] --> B["2 · Descubrir<br/><small>ProjectDiscoverer</small>"]
    B --> C{"3 · Validar<br/><small>ProjectValidator</small>"}
    C -->|"cualquier error"| X["El build lanza una excepción.<br/>.build/app nunca se escribe ni se toca"]
    C -->|"limpio<br/><small>las advertencias nunca bloquean</small>"| D["4 · Generar"]
    D --> D1["1 Interceptores"] --> D2["2 Gateways"] --> D3["3 MCP"] --> D4["4 Router"]
    D4 --> D5["5 Interfaz web"] --> D6["6 Esqueleto de app principal"] --> D7["7 Copia de tools/skills"] --> D8["8 Librerías de runtime"] --> D9["9 Scheduler"]
    D9 --> E["5 · Normalizar + escribir<br/><small>ManifestNormalizer</small>"]
    E --> F[".build/manifest.json<br/>+ .build/app - una aplicación ColdBox normal"]

    style C fill:#fff3cd,stroke:#856404
    style X fill:#f8d7da,stroke:#721c24
    style F fill:#d4edda,stroke:#155724
```

La validación es la puerta: recopila **todos** los errores en lugar de fallar rápido, y nada se genera hasta que vuelve limpia.

(El empaquetado en un `.bxa` es un paso deliberadamente separado - ver [Despliegue y secretos](deployment-and-secrets.md) - para que un ciclo rápido de `build` → inspeccionar → `build` de nuevo nunca pague un costo de empaquetado que no necesita.)

## 1. Resolver config

[`AgentConfigResolver`](conventions/agent-yaml.md) carga la definición del agente (`Agent.yaml`, o el `Agent.bx` basado en clase), aplica los overrides del entorno activo (el bloque `environments:` de un `Agent.yaml`, o el método de override y `configure()` de un `Agent.bx`), luego fusiona en profundidad `boxlang.json`/`boxlang-{env}.json`/`miniserver.json`/`miniserver-{env}.json` si están presentes. Produce el único struct de configuración resuelto del que lee cada fase posterior.

## 2. Descubrir

[`ProjectDiscoverer`](conventions/agent-bx.md) recorre la raíz del proyecto y enumera cada carpeta de convención (`models/`, `tools/`, `skills/`, `subagents/`, `gateways/`, `mcp/`, `interceptors/`, `modules/`) en entradas crudas `{ name, path, type }`. `schedules/` es la única excepción - no es una lista de entradas, solo un único par `hasScheduler`/`schedulerPath`, ya que contiene un archivo real de scheduler de ColdBox en lugar de un conjunto de entradas de configuración definidas por BxAgents. Descubrimiento puro - todavía no ocurre ninguna interpretación del contenido de los archivos.

## 3. Validar

[`ProjectValidator`](conventions/agent-bx.md) ejecuta cada validador y recopila **todos** los errores (nunca falla rápido) más cualquier advertencia: nombres duplicados de tool/skill/model/subagent, `name`s de agente duplicados a través de todo el árbol de subagentes (ver [subagents/](conventions/subagents.md#retrieving-an-agent-from-schedulesschedulerbx)), referencias circulares de subagente/módulo, las dos formas de entrada de gateway, la completitud de configuración de MCP remoto, y la validez de modelo/proveedor. Si se recopiló algún error, el build lanza una excepción inmediatamente aquí - no se escribe ni se toca `.build/app`. Las advertencias (por ejemplo, una carpeta `schedules/` sin `Scheduler.bx` dentro) nunca bloquean el build.

## 4. Generar

Solo se alcanza una vez que la validación está limpia. En orden:

1. **Interceptores** - [`InterceptorSplitter`](conventions/interceptors.md) copia los interceptores de scope `agent` a `.build/app/interceptors`, los de scope `runtime` a un directorio separado `.build/runtime-interceptors`, fuera de la app (BxAgents no los registra por ti).
2. **Gateways** - [`GatewayGenerator`](conventions/gateways/index.md) emite sentencias `aiGatewayRegistry().register(...)` para las entradas de tipo channel-adapter, y escribe un pequeño handler de webhook `.build/app/handlers/*.bx` por cada entrada `whatsapp-cloud`, `teams`, `twilio` o `github`. Si alguna entrada es un gateway de estilo push (por ejemplo, `type: "telegram"`), también produce la sentencia de arranque que construye un único `GatewaySession` de bx-ai (agrupando cada gateway de estilo push) asociado al agente raíz del proyecto.
3. **MCP** - [`McpGenerator`](conventions/mcp.md) copia los servidores locales `mcp/*` a `.build/app/mcp` y emite sus sentencias de registro `mcpServer(...).registerTool(...)`.
4. **Router** - [`RouterGenerator`](conventions/gateways/index.md) escribe `.build/app/config/Router.bx`: la ruta de agente reservada [`/__bxagents`](conventions/agent-bx.md#la-ruta-de-agente-siempre-activa) (salvo que `agentApi.enabled` sea `false`), un `route(path).toAi(...)`/`toMCP(...)` por entrada de exposición, un único `route("/gateways").toAiGateway()` si el proyecto tiene algún gateway de tipo channel-adapter, y una ruta de webhook por cada gateway push de tipo `whatsapp-cloud` (GET+POST), `teams`, `twilio` o `github` presente.
5. **Interfaz web** - [`WebUiGenerator`](conventions/web-ui.md) se ejecuta para cualquier entrada `exposes: "webui"`, escribiendo el `<path>/index.html` estático, `handlers/ChatUi.bx` (la API de veinte acciones), `models/ChatDb.bx` (el almacén SQLite y sus migraciones exclusivamente hacia adelante, construido en el arranque por una sentencia de inicio en lugar de en cualquier request que toque primero la base de datos), los modelos de usuario (`User`, `UserService`, `PasswordHasher`), y - solo cuando `apiKeyEnvVar` está configurado - `interceptors/WebUiAuthGate.bx`. Cuando se declaran `users`, también escribe el seeder de cuentas, `interceptors/WebUiLoginGate.bx` y `handlers/ChatAuth.bx`. Devuelve la configuración de base de datos resuelta, que el siguiente paso necesita.
6. **Esqueleto de app principal** - `ColdBoxAppGenerator` escribe `Application.bx`, `config/ColdBox.bx`, `config/WireBox.bx`, `agent/GeneratedAgentFactory.bx`, e `index.bxm`, incorporando cada sentencia recopilada arriba (registros de gateway, el arranque del `GatewaySession`, registros MCP, el calentamiento del almacén y el seeding de cuentas de la interfaz web, y - si `tools/` tiene algún archivo - una llamada simple `aiToolRegistry().scan("tools")`) en el `onApplicationStart()` de `Application.bx`. Los interceptores también se registran ahí, un `getInterceptorService().register(...)` por cada interceptor de scope `agent` y cada compuerta de la interfaz web: un array declarativo `interceptors` en `config/ColdBox.bx` nunca llega al servicio de interceptores de ColdBox, así que la configuración generada no declara ninguno. Cada agente generado también recibe ahora siempre un checkpointer (`withCheckpointer(...)`, por defecto un `aiMemory()` respaldado por `cache` si el proyecto no declara configuración `checkpointer` y la clase no configuró ninguna propia) - sin uno, los flujos de aprobación human-in-the-loop a través de cualquier gateway que no sea `cli` fallan por completo. `config/WireBox.bx` mapea cada agente en el árbol (raíz + cada subagente) bajo su propio `name` declarado, no solo el alias fijo `"GeneratedAgent"` de la raíz - ver [schedules/](conventions/schedules.md). El `instructions.md` de cada nodo de agente se **copia dentro de la app** como parte de este paso, replicando la estructura del código fuente bajo `agent/` - el del proyecto raíz a `.build/app/agent/instructions.md`, el de cada subagente a `.build/app/agent/subagents/<name>/instructions.md` - de modo que cada nodo conserva el suyo y la app construida lleva el archivo que lee en tiempo de ejecución. La factory lee sus tres rutas de runtime (`instructions.md`, su propio `tools/` y el `Agent.bx` copiado de cualquier agente basado en clase) mediante un pequeño helper generado `resolveAppPath()` que las resuelve relativas a la ubicación en disco de la propia factory, recurriendo a la ruta absoluta del momento del build si esa autolocalización no se resuelve - y eso es lo que hace que un `.bxa` empaquetado sea realmente reubicable en lugar de ejecutable solo en la máquina que lo construyó. Para un proyecto con una exposición `webui` también activa la gestión de sesiones, registra el datasource SQLite (nombrándolo como el datasource por defecto de la app vía `this.datasource`), crea el directorio padre de la base de datos en `onApplicationStart()` - SQLite crea el archivo pero nunca la carpeta que lo contiene - y fija la gramática de qb en `config/ColdBox.bx`.
7. **Copia de tools/skills** - `ToolsSkillsCopier` borra y reescribe `.build/app/tools` y `.build/app/skills` textualmente a partir de las propias carpetas de tu proyecto.
8. **Librerías de runtime** - `RuntimeLibsCopier` copia el runtime de ColdBox incluido dentro de BxAgents hacia `.build/app`: `coldbox/` más `modules/qb`, `modules/cbsecurity`, `modules/cbauth`, `modules/cbmailservices` y sus dependencias. Una carpeta `lib/` en tu proyecto (misma estructura) se copia después y tiene prioridad, que es como añades o sobrescribes una librería. La copia incluida solo existe en un módulo instalado o construido, así que un checkout de código fuente omite este paso con un aviso.
9. **Scheduler** - [`SchedulerGenerator`](conventions/schedules.md) copia `schedules/Scheduler.bx` hacia `.build/app/config/Scheduler.bx` sin tocarlo, si está presente - sin generación, es código ColdBox real que tú mismo escribiste.

## 5. Normalizar + escribir el manifest

[`ManifestNormalizer`](manifest.md) produce el manifest interno canónico, con hash estampado, a partir de los datos de descubrimiento + configuración resuelta, y el pipeline lo escribe en `.build/manifest.json`.

## Idempotencia

Reconstruir un proyecto sin cambios produce una salida idéntica byte a byte, hasta los hashes de contenido por archivo del manifest - todo el sentido de pagar el costo de ensamblaje una sola vez, en tiempo de build, en lugar de diferir cualquiera de este trabajo al manejo de requests.
