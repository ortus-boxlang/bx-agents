/**
 * One command for working on the web app: the dev stack (the agent and its scripted model, see stack.mjs) and the Vite
 * dev server, together. The agent links the module from src/main/bx/bxagentsui, so:
 *   - a change to a view or a layout shows on reload
 *   - a change to the Sass or the JS reloads the page by itself (Vite)
 *   - a change to a handler or ModuleConfig needs the stack restarted (Ctrl+C, then npm run dev again)
 *
 *   npm run dev            build the agent, then start everything
 *   npm run dev -- --no-build
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ui = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), ".." );
const children = [
	spawn( process.execPath, [ "scripts/stack.mjs", ...process.argv.slice( 2 ) ], { cwd: ui, stdio: "inherit", env: { ...process.env, UI_VITE_DEV: "1" } } ),
	spawn( process.execPath, [ path.join( ui, "node_modules/vite/bin/vite.js" ) ], { cwd: ui, stdio: "inherit" } )
];
const stop = () => {
	children.forEach( c => c.kill( "SIGTERM" ) );
	setTimeout( () => process.exit( 0 ), 500 );
};
process.on( "SIGINT", stop );
process.on( "SIGTERM", stop );
children.forEach( c => c.on( "exit", code => code && stop() ) );
