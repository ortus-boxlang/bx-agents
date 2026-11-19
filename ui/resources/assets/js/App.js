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
import { renderMarkdown, listenForCodeCopy } from "./utils/markdown.js";
import * as format from "./utils/format.js";
import { session } from "./stores/session.js";
import { theme } from "./stores/theme.js";
import { appearance } from "./stores/appearance.js";
import { nav } from "./stores/nav.js";
import { toast } from "./stores/toast.js";
import { confirm } from "./stores/confirm.js";
import { appShell } from "./components/app/AppShell.js";
import { kitPage } from "./components/kit/KitPage.js";
import { dataPage } from "./components/admin/DataPage.js";
import { logsPage } from "./components/admin/LogsPage.js";
import { gatewaysPage } from "./components/admin/GatewaysPage.js";
import { settingsPage } from "./components/settings/SettingsPage.js";
import { accessPage } from "./components/admin/AccessPage.js";
import { registryPage } from "./components/registry/RegistryPage.js";
import { vaultPage } from "./components/vault/VaultPage.js";
import { conversationsPage } from "./components/conversations/ConversationsPage.js";
import { memoryPage } from "./components/memory/MemoryPage.js";
import { agentPage } from "./components/admin/AgentPage.js";
import { routinesPage } from "./components/routines/RoutinesPage.js";
import { connectorsPage } from "./components/connectors/ConnectorsPage.js";
import { chatPage } from "./components/chat/ChatPage.js";

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
Alpine.store( "theme", theme( api ) );
Alpine.store( "appearance", appearance() );
Alpine.store( "nav", nav( Alpine ) );
Alpine.store( "toast", toast() );
Alpine.store( "confirm", confirm() );

// ============================================================
// Magics: what every component may use
//   $api.get( path ) / $api.post( path, body )   { ok, status, data, error }, never throws
//   $sse( path, { body, onEvent, signal } )       a stream of the agent API (POST /stream, /events, /resume)
//   $confirm( { title, body, danger } )           Promise<boolean>
//   $prompt( { title, label, value } )            Promise<string|null>, null on Cancel
//   $toast.success( text ) / $toast.error( text )
//   $md( text )                                   Markdown as safe HTML, the only input x-html takes
//   $fmt.stampText / dayText / bytesText / countLabel
// ============================================================
Alpine.magic( "api", () => api );
Alpine.magic( "sse", () => ( path, options ) => streamEvents( api.url( path ), { ...options, headers: api.headers() } ) );
Alpine.magic( "confirm", () => question => Alpine.store( "confirm" ).ask( question ) );
Alpine.magic( "prompt", () => question => Alpine.store( "confirm" ).prompt( question ) );
Alpine.magic( "toast", () => Alpine.store( "toast" ) );
Alpine.magic( "md", () => renderMarkdown );
Alpine.magic( "fmt", () => format );

// ============================================================
// Components
// ============================================================
Alpine.data( "appShell", appShell );
Alpine.data( "dataPage", dataPage );
Alpine.data( "logsPage", logsPage );
Alpine.data( "gatewaysPage", gatewaysPage );
Alpine.data( "settingsPage", settingsPage );
Alpine.data( "accessPage", accessPage );
Alpine.data( "registryPage", registryPage );
Alpine.data( "vaultPage", vaultPage );
Alpine.data( "conversationsPage", conversationsPage );
Alpine.data( "memoryPage", memoryPage );
Alpine.data( "agentPage", agentPage );
Alpine.data( "routinesPage", routinesPage );
Alpine.data( "connectorsPage", connectorsPage );
Alpine.data( "chatPage", chatPage );
Alpine.data( "kitPage", kitPage );

window.Alpine = Alpine;
listenForCodeCopy( document );
Alpine.start();
