---
title: "Guía: Trabajar en la app web"
icon: phosphor-duotone:code
summary: Cómo se construye la app web, cómo arrancarla con un agente de guion, sus convenciones y cómo añadir una página con sus pruebas.
description: El módulo de ColdBox bxagentsui y la carpeta ui/, npm run dev, stack y build, el agente de desarrollo y su modelo con guion, las convenciones, las piezas, añadir una página, linters, pruebas y material de prueba para los pull requests.
tags: [guides, web-ui, contributing]
---

# Guía: Trabajar en la app web

Esta guía es para quien cambia la [app web](../conventions/web-ui.md) misma, en este repositorio. Para usar la app en un agente no hace falta nada de esto: `bxAgents build` la instala, ya compilada.

La app es un módulo de ColdBox, `bxagentsui`, hecho a la manera de cbGenesis: handlers, vistas y parciales en BoxLang, y los scripts y estilos (Alpine.js y Sass) compilados con Vite. Es cliente de la [API del agente](agent-api.md): un handler elige una vista, y el componente Alpine de la página lee sus datos de `/__bxagents`.

Las reglas y las tablas completas de piezas están en [`ui/AGENTS.md`](https://github.com/ortus-boxlang/bx-agents/blob/development/ui/AGENTS.md) (en inglés). Léelo antes de cambiar la app. Esta guía es el recorrido.

## Dónde está cada cosa

| Parte | Ruta |
|---|---|
| El módulo: `ModuleConfig.bx`, `config/Router.bx`, `handlers/`, `layouts/`, `views/`, `models/` | `src/main/bx/bxagentsui/` |
| Parciales | `src/main/bx/bxagentsui/views/_components/{app,ui}/` |
| Sass: tokens, base, layouts, componentes, vistas, en ese orden | `ui/resources/assets/scss/` |
| Alpine: `App.js`, `stores/`, `components/<dominio>/`, `utils/` | `ui/resources/assets/js/` |
| El build de Vite, confirmado | `src/main/bx/bxagentsui/includes/build/` |
| El agente de desarrollo y su modelo con guion | `ui/dev/agent/`, `ui/dev/model.json` |
| Formas de proyecto (otras rutas, una contraseña, sin cuentas) | `ui/dev/shapes/` |
| Pruebas de navegador | `ui/tests/e2e/`, `ui/tests/shapes/` |
| Recorridos para capturas y vídeo | `ui/tests/media/` |

## Cómo la recibe un agente

Por cada entrada `gateways/*.bx` con `exposes: "webui"`, el build (`WebAppModule`) copia el módulo a `<app>/modules/bxagentsui` y escribe `config/bxagentsui.json`: dónde se monta la app (`basePath`, el `path` de la entrada), dónde está la API del agente (`apiBase`), la marca, el tema y los archivos de las extensiones del proyecto. `ModuleConfig.bx` lee ese archivo cuando ColdBox registra el módulo, así que el módulo responde en la ruta de la entrada.

El build de los scripts y estilos está confirmado en `includes/build`. El build de un agente nunca ejecuta Node, así que un cambio en un script o un estilo solo se distribuye cuando `npm run build` se ha ejecutado y su salida está confirmada.

Con `BXAGENTS_UI_LINK=true` el build enlaza el módulo en lugar de copiarlo, así que un cambio en una vista se ve en la siguiente petición. `npm run stack` lo define. Solo un módulo enlazado sirve `<path>/_kit`, una página con cada parcial y cada magic funcionando; un agente compilado responde 404 allí.

## Prepararla una vez

Desde la raíz del repositorio:

```bash
./gradlew downloadBoxLang downloadMiniServer shadowJar
cd ui && npm install
npx playwright install chromium     # si aún no tienes un navegador de Playwright
```

## Arrancarla

```bash
npm run dev        # el agente de desarrollo, su modelo y el servidor de desarrollo de Vite
npm run stack      # solo el agente de desarrollo y su modelo, con el build confirmado
```

La app está en http://127.0.0.1:8780/chat. Entra como `ada` (admin) o `bob` (miembro), contraseña `demo-pass`.

En `npm run dev` un cambio en una vista o un layout se ve al recargar, y un cambio en el Sass o en un script recarga la página solo. Un cambio en un handler, un modelo o `ModuleConfig.bx` necesita reiniciar el stack (Ctrl+C y `npm run dev` otra vez). `npm run dev -- --no-build` arranca sin volver a compilar el agente.

### El agente de desarrollo y su modelo con guion

El agente de desarrollo es `ui/dev/agent`, compilado y servido por el propio bxAgents de este repositorio. Su modelo sigue un guion: `ui/dev/model.json`, servido por `tools/demo/fakellm.bxs`. Nada necesita una clave ni la red.

| Pregunta | Recibes |
|---|---|
| "what time is it" | una llamada a la herramienta `now`, y luego la respuesta |
| "give me a list" | Markdown: una lista numerada y un bloque de código |
| cualquier otra cosa | una respuesta simple que nombra el modelo |

El agente tiene dos perfiles (`fast`, `planner`), notas, un vault, rutinas y una extensión de carpeta, `panel` (ver [extensiones](../conventions/extensions.md#un-ejemplo-completo-panel)). Guarda sus datos en `ui/.stack/home`: borra esa carpeta para empezar de cero. `UI_AGENT_PORT` y `UI_LLM_PORT` cambian los puertos (8780 y 8080).

## Compilar

```bash
npm run build      # escribe src/main/bx/bxagentsui/includes/build
```

Confirma el build con el cambio que lo necesita.

## Convenciones

La lista completa está en `ui/AGENTS.md`. En resumen:

- **Los handlers son finos.** Eligen el layout y la vista y comprueban quién puede ver la página. Los datos vienen de la API del agente a través del componente Alpine de la página. Nada de lógica de negocio en un handler.
- **Los parciales documentan sus args** en un comentario de cabecera y declaran cada uno con `<bx:param name="args.x" default="..."/>`. Se llaman con `view( view = "_components/ui/name", module = "bxagentsui", args = { ... } )`.
- **Escapa lo que escribe el servidor** con `encodeForHTML()`. Los datos para los scripts pasan por `PageData.json()` a un bloque `<script type="application/json">`, nunca a un script.
- **Ningún valor del servidor dentro de atributos `x-`, `:` o `@`.** Se ejecutan como código. Pon el valor en un atributo `data-` y léelo en la expresión (`$el.dataset.x`) o en `init()`.
- **Cada color es un token** en `abstracts/_tokens.scss`, para que funcionen el tema oscuro y el bloque `theme` del gateway.
- **Una factoría de Alpine por archivo**, registrada en `App.js` con `Alpine.data( "name", factory )`, con JSDoc en cada función, getter y miembro de store.
- **Enlaza los atributos booleanos a un booleano real** (`:disabled="!!t.locked"`), nunca a un valor que pueda ser `undefined` o `null`.
- **Accesible por defecto:** un enlace para saltar al contenido, un anillo de foco visible, diálogos que retienen y devuelven el foco, y un `aria-label` en un botón de solo icono que empieza por su texto visible, si lo tiene.
- **Un cambio necesita una prueba:** una prueba de navegador para lo que ve una persona, un spec de TestBox para el código BoxLang.

## Las piezas

Úsalas antes de escribir marcado o lógica propios. `ui/AGENTS.md` tiene cada una con sus args.

| Parcial (`views/_components/ui/`) | Qué es |
|---|---|
| `page-head` | El título de una página, una línea debajo y sus acciones |
| `tabs` | Una fila de pestañas (una tablist ARIA) enlazada a una variable del componente |
| `search` | Una caja de búsqueda con debounce |
| `chip` | Un estado o un conteo (`ok`, `warn`, `bad`) |
| `card` | Una caja que contiene otra vista |
| `field` | Etiqueta, control, línea de ayuda y línea de error |
| `switch` | Un interruptor de encendido y apagado, un checkbox real |
| `modal`, `drawer` | Un `<dialog>` nativo, centrado o lateral, que contiene otra vista |
| `table` | Una tabla que se desplaza en un teléfono, con filas de Alpine |
| `empty` | Lo que muestra una lista cuando no tiene nada |
| `icon` | Un icono del conjunto |
| `toasts`, `confirm` | En el layout una vez: la región de mensajes y el diálogo de pregunta |

| Magic o store | Qué hace |
|---|---|
| `$api.get( path )`, `$api.post( path, body )` | Llama a la API del agente. Responde `{ ok, status, data, error }`, nunca lanza |
| `$sse( path, { body, onEvent, signal } )` | Un stream de la API del agente |
| `$confirm( { title, body, danger } )`, `$prompt( { title, label, value } )` | Los diálogos propios de la app; nunca `window.confirm` ni `window.prompt` |
| `$toast.success( text )`, `$toast.error( text )` | Un mensaje corto |
| `$md( text )` | Markdown como HTML seguro, la única entrada que acepta `x-html` |
| `$fmt` | Fechas, tamaños y conteos, iguales en todas partes |
| `$tabKeys( $event )` | Las flechas, Inicio y Fin de una fila de pestañas |
| `$store.session` | Lo que esta persona puede usar: `can( capability )`, `agentName`, `agents`; primero `await loaded()` en `init()` |
| `$store.theme`, `$store.appearance`, `$store.nav` | Claro u oscuro; acento, tamaño de texto y densidad; el menú plegado y el cajón del teléfono |
| `$store.password` | La contraseña de un agente sin cuentas, enviada en cada llamada |

`window.bxagents` es el contrato de las extensiones, ver [extensiones](../conventions/extensions.md#el-objeto-bxagents).

## Añadir una página

Una página es una ruta, una entrada del menú, un handler, una vista y un componente Alpine. Digamos que la página es `reports`.

1. **La ruta.** En `config/Router.bx`, añade `route( "/reports" ).to( "Reports.index" )` encima de la última ruta. La última ruta manda cualquier otra dirección a `Main.missing`, que responde 404.
2. **El menú.** En `models/Menu.bx`, añade la página a `PAGES`: `{ id : "reports", title : "Reports", icon : "chart-line", group : "main", capability : "" }`. El menú de la izquierda se dibuja desde esa lista. `capability` es la capacidad de `GET /agent` que necesita la página (`""` para todos, `"a|b"` para cualquiera de las dos, `"~a"` para "salvo que `a` sea false"). Una página del grupo `admin` responde 403 a un miembro con sesión iniciada.
3. **El handler.** `handlers/Reports.bx` extiende `BaseHandler` y tiene un solo `index()`:

    ```text
    class extends="BaseHandler" {

    	function index( event, rc, prc ) {
    		showPage( event, prc, "reports", "reports/index" )
    	}

    }
    ```

    `showPage()` responde 404 a una página que no está en el menú y 403 a una página admin para cualquier otro, así que todas las páginas siguen la misma regla.

4. **La vista.** `views/reports/index.bxm` empieza con `<div class="pg" x-data="reportsPage">` y el parcial `page-head`. Un valor del servidor que necesita el componente va en un atributo `data-`, escapado con `encodeForHTML()`.
5. **El componente.** `ui/resources/assets/js/components/reports/ReportsPage.js` exporta una factoría, `reportsPage()`, registrada en `App.js` con `Alpine.data( "reportsPage", reportsPage )`. Lee sus datos con `$api` en `init()`. Una pestaña o un filtro que la dirección debe conservar pasa por `keepInAddress()` (`utils/address.js`).
6. **Los estilos**, si los parciales no bastan: un archivo bajo `scss/views/`, usado en `app.scss`, con tokens para cada color.
7. **Las pruebas.** Añade `"reports"` a `PAGES` en `ui/tests/e2e/a11y.spec.js` (y a `MEMBER_PAGES` cuando la ve un miembro), y escribe una prueba de navegador en `ui/tests/e2e` para lo que hace una persona en la página. Ejecuta también `npm run e2e:shapes`: un cambio en las rutas, las direcciones o el marco debe funcionar con cada forma de proyecto.
8. **El build.** `npm run build`, y confirma `includes/build` con el cambio.

Un cambio en el router, el menú o un handler necesita reiniciar el stack.

## Linters

```bash
npm run lint       # ESLint, los scripts (lint:fix arregla lo que puede)
npm run lint:scss  # Stylelint, el Sass (lint:scss:fix)
npm run lint:md    # markdownlint: docs/, changelog.md, readme.md y las notas de ui/
```

Las reglas son las de cbGenesis: `eslint.config.mjs`, `.stylelintrc.json`, y `.markdownlint.json` y `.bxlint.json` en la raíz del repositorio. CI falla con cualquier hallazgo.

## Pruebas

```bash
npm test             # las pruebas unitarias de los scripts (Vitest)
npm run e2e          # todas las pruebas de navegador, contra un stack que arranca (o el que ya corre)
npm run e2e:headed   # lo mismo, con el navegador en pantalla
npm run e2e:shapes   # cada página con otras formas de proyecto
```

Las pruebas de navegador inician sesión una vez con cada cuenta, empiezan cada prueba de chat en una conversación nueva y fallan con cualquier error que lance la página. Dos de ellas revisan toda la app:

- `a11y.spec.js` ejecuta axe-core (WCAG 2.2 AA) en cada página, como admin y como miembro, en claro y oscuro, en escritorio y teléfono, y con los diálogos abiertos. Un hallazgo grave o crítico hace fallar.
- `keyboard.spec.js` comprueba el enlace para saltar al contenido, un anillo de foco visible en cada parada de Tab, diálogos que retienen y devuelven el foco, y el movimiento reducido.

`npm run e2e:shapes` vuelve a compilar el agente de desarrollo para cada carpeta de `ui/dev/shapes`, las sirve una junto a otra en los puertos 8791 y siguientes, y comprueba que cada página responde, dibuja su marco, enlaza sus archivos y extensiones bajo su ruta y habla con su API:

| Forma | Ruta | Inicio de sesión |
|---|---|---|
| `open-support` | `/support` | ninguno, una API abierta, un icono Phosphor y un acento de tema |
| `password` | `/chat` | el secreto compartido de la API, con el diálogo de contraseña |
| `nested-api` | `/team/assistant` | ninguno, con la API del agente en `/team/api` |

Añade una carpeta a `ui/dev/shapes` (un `gateways/chat.bx` y un `shape.json`) para probar otra forma.

## Pruebas en un pull request

Cada pull request que cambia la app lleva capturas y un vídeo corto del cambio. Escribe un recorrido en `ui/tests/media/<nombre>.tour.js` que recorra el flujo y llame a `shot( "lo-que-muestra" )` en cada paso. Luego, con el stack en marcha:

```bash
npm run media -- <nombre>      # .stack/media/<nombre>/: NN-*.png, tour.mp4, tour.gif
```

Publica la carpeta en la rama `pr-media`, nunca en una rama de código, bajo `<número-del-pr>/`, y enlaza los archivos en el pull request: el GIF y las capturas se ven en línea, el MP4 es un enlace.
