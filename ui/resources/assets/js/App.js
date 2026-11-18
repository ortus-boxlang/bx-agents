/**
 * The web app's one script, built by Vite: Alpine with its plugins, the stores, the shared magics and the components.
 * Order as in cbGenesis: plugins, stores, components, then start.
 */
import Alpine from "alpinejs";
import focus from "@alpinejs/focus";
import persist from "@alpinejs/persist";

import { readConfig } from "./utils/config.js";
import { session } from "./stores/session.js";
import { theme } from "./stores/theme.js";
import { nav } from "./stores/nav.js";
import { appShell } from "./components/app/AppShell.js";

// ============================================================
// Plugins
// ============================================================
Alpine.plugin( focus );
Alpine.plugin( persist );

// ============================================================
// Stores: who is signed in and what the agent offers, the theme, the menu
// ============================================================
const config = readConfig();
Alpine.store( "session", session( config ) );
Alpine.store( "theme", theme( Alpine ) );
Alpine.store( "nav", nav( Alpine ) );

// ============================================================
// Components
// ============================================================
Alpine.data( "appShell", appShell );

window.Alpine = Alpine;
Alpine.start();
