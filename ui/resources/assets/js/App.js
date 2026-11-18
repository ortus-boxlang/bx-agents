/**
 * The web app's one script, built by Vite: Alpine with its plugins, the stores, the shared magics and the components.
 * Order as in cbGenesis: plugins, stores, magics, components, then start.
 */
import Alpine from "alpinejs";
import focus from "@alpinejs/focus";
import persist from "@alpinejs/persist";

import { readConfig } from "./utils/config.js";
import { createApi } from "./utils/api.js";
import { streamEvents } from "./utils/sse.js";
import { renderMarkdown } from "./utils/markdown.js";
import * as format from "./utils/format.js";
import { session } from "./stores/session.js";
import { theme } from "./stores/theme.js";
import { nav } from "./stores/nav.js";
import { toast } from "./stores/toast.js";
import { confirm } from "./stores/confirm.js";
import { appShell } from "./components/app/AppShell.js";
import { kitPage } from "./components/kit/KitPage.js";

// ============================================================
// Plugins
// ============================================================
Alpine.plugin( focus );
Alpine.plugin( persist );

// ============================================================
// Stores: who is signed in and what the agent offers, the theme, the menu, messages, the question dialog
// ============================================================
const config = readConfig();
const api = createApi( config.apiBase );
Alpine.store( "session", session( config ) );
Alpine.store( "theme", theme( Alpine ) );
Alpine.store( "nav", nav( Alpine ) );
Alpine.store( "toast", toast() );
Alpine.store( "confirm", confirm() );

// ============================================================
// Magics: what every component may use
//   $api.get( path ) / $api.post( path, body )   { ok, status, data, error }, never throws
//   $sse( path, { body, onEvent, signal } )       a stream of the agent API (POST /stream, /events, /resume)
//   $confirm( { title, body, danger } )           Promise<boolean>
//   $toast.success( text ) / $toast.error( text )
//   $md( text )                                   Markdown as safe HTML, the only input x-html takes
//   $fmt.stampText / dayText / bytesText / countLabel
// ============================================================
Alpine.magic( "api", () => api );
Alpine.magic( "sse", () => ( path, options ) => streamEvents( api.url( path ), { ...options, headers: api.headers() } ) );
Alpine.magic( "confirm", () => question => Alpine.store( "confirm" ).ask( question ) );
Alpine.magic( "toast", () => Alpine.store( "toast" ) );
Alpine.magic( "md", () => renderMarkdown );
Alpine.magic( "fmt", () => format );

// ============================================================
// Components
// ============================================================
Alpine.data( "appShell", appShell );
Alpine.data( "kitPage", kitPage );

window.Alpine = Alpine;
Alpine.start();
