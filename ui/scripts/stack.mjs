/**
 * Starts what the web UI talks to: the scripted model and the dev agent (ui/dev/agent), built and served by this repo's
 * own bxAgents. Nothing needs a key or the network.
 *
 *   node scripts/stack.mjs            build, start, and keep running until Ctrl+C
 *   node scripts/stack.mjs --no-build start without building again
 *
 * Environment:
 *   UI_AGENT_PORT  where the agent is served (default 8780), the web app is at http://127.0.0.1:8780/chat
 *   UI_LLM_PORT    where the scripted model listens (default 8080, what the openai-compatible provider calls)
 *   BOXLANG_JAR    the BoxLang jar to run with (default: the newest boxlang-*.jar in src/test/resources/libs)
 *
 * The agent keeps its data in ui/.stack/home, so a run never touches your own agents. Delete that folder to start fresh.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname( fileURLToPath( import.meta.url ) );
const ui = path.resolve( here, ".." );
const repo = path.resolve( ui, ".." );
const stackDir = path.join( ui, ".stack" );
const agentPort = Number( process.env.UI_AGENT_PORT || 8780 );
const llmPort = Number( process.env.UI_LLM_PORT || 8080 );
const build = !process.argv.includes( "--no-build" );

/**
 * @param {string} prefix The file name start
 * @returns {string} The newest jar in src/test/resources/libs whose name starts with the prefix and a version
 */
function newestJar( prefix ) {
	const dir = path.join( repo, "src/test/resources/libs" );
	const found = fs.existsSync( dir ) ? fs.readdirSync( dir ).filter( f => new RegExp( "^" + prefix + "-\\d.*\\.jar$" ).test( f ) ).sort() : [];
	if ( !found.length ) {
		throw new Error( "No " + prefix + " jar in " + dir + ". Run ./gradlew downloadBoxLang first." );
	}
	return path.join( dir, found[ found.length - 1 ] );
}

const boxlangJar = process.env.BOXLANG_JAR || newestJar( "boxlang" );

// includes/hot sends the page to the Vite dev server; one left by a dev server that did not stop cleanly would make the
// page load nothing. npm run dev (dev.mjs) says the dev server is running.
const hotFile = path.join( repo, "src/main/bx/bxagentsui/includes/hot" );
if ( !process.env.UI_VITE_DEV && fs.existsSync( hotFile ) ) {
	fs.rmSync( hotFile );
}
// the scripts and styles are not committed: without the Vite build the app loads nothing, so say how to make it
if ( !process.env.UI_VITE_DEV && !fs.existsSync( path.join( repo, "src/main/bx/bxagentsui/includes/build/.vite/manifest.json" ) ) ) {
	console.error( "The web app is not built: src/main/bx/bxagentsui/includes/build/.vite/manifest.json is missing.\n" +
		"Run `npm run build` in ui/ (or `./gradlew uiBuild` in the repository root), or use `npm run dev`." );
	process.exit( 1 );
}
const classPath = [
	boxlangJar,
	path.join( repo, "build/classes/java/main" )
].join( path.delimiter );

// serve looks for boxlang-miniserver on the PATH; give it one that runs the jar when it is not installed
const binDir = path.join( stackDir, "bin" );
fs.mkdirSync( binDir, { recursive: true } );
const onPath = ( process.env.PATH || "" ).split( path.delimiter ).some( d => fs.existsSync( path.join( d, "boxlang-miniserver" ) ) );
if ( !onPath ) {
	const wrapper = path.join( binDir, "boxlang-miniserver" );
	fs.writeFileSync( wrapper, "#!/bin/sh\nexec java -jar \"" + newestJar( "boxlang-miniserver" ) + "\" \"$@\"\n", { mode: 0o755 } );
}

const env = {
	...process.env,
	PATH                : binDir + path.delimiter + ( process.env.PATH || "" ),
	BXAGENTS_HOME       : path.join( stackDir, "home" ),
	BXAGENTS_PUBLIC_URL : "http://127.0.0.1:" + agentPort,
	// the web app module is linked into the built agent, not copied: a change to a view or a handler shows on reload
	BXAGENTS_UI_LINK    : process.env.BXAGENTS_UI_LINK || "true",
	BXAGENTS_UI_SOURCE  : path.join( repo, "src/main/bx/bxagentsui" )
};

/**
 * @param {string[]} args What follows the BoxLang runner
 * @returns {string[]} The java command line
 */
const boxlang = args => [
	"-cp",
	classPath,
	"ortus.boxlang.runtime.BoxRunner",
	"--bx-config",
	path.join( repo, "boxlang.json" ),
	...args
];

if ( build ) {
	console.log( "[stack] building ui/dev/agent" );
	const done = spawnSync( "java", boxlang( [
		"module:bxagents",
		"build",
		"--projectRoot=" + path.join( ui, "dev/agent" )
	] ), { cwd: repo, env, stdio: "inherit" } );
	if ( done.status !== 0 ) {
		process.exit( done.status || 1 );
	}
}

const children = [];

/**
 * @param {string} name A label for the log lines
 * @param {string[]} args The java arguments
 * @returns {import("node:child_process").ChildProcess} The started process
 */
function start( name, args ) {
	const child = spawn( "java", args, {
		cwd   : repo,
		env,
		stdio : [
			"ignore",
			"pipe",
			"pipe"
		]
	} );
	const prefix = line => line.length && console.log( "[" + name + "] " + line );
	child.stdout.on( "data", d => String( d ).split( "\n" ).forEach( prefix ) );
	child.stderr.on( "data", d => String( d ).split( "\n" ).forEach( prefix ) );
	child.on( "exit", code => console.log( "[" + name + "] exited " + code ) );
	children.push( child );
	return child;
}

start( "model", boxlang( [
	path.join( repo, "tools/demo/fakellm.bxs" ),
	"--port=" + llmPort,
	"--script=" + path.join( ui, "dev/model.json" )
] ) );
start( "agent", boxlang( [
	"module:bxagents",
	"serve",
	"--projectRoot=" + path.join( ui, "dev/agent" ),
	"--port=" + agentPort
] ) );

/**
 * @param {string} url What to ask
 * @param {number} seconds How long to keep trying
 * @returns {Promise<void>} Resolves once the address answers
 */
async function waitFor( url, seconds ) {
	const until = Date.now() + seconds * 1000;
	while ( Date.now() < until ) {
		try {
			const res = await fetch( url );
			if ( res.status < 500 ) {
				return;
			}
		} catch {
			// not up yet
		}
		await new Promise( r => setTimeout( r, 500 ) );
	}
	throw new Error( url + " did not answer in " + seconds + "s" );
}

const stop = () => {
	children.forEach( c => c.kill() );
	// serve hands the app to a boxlang-miniserver process of its own and returns: stop that one by its config file
	spawnSync( "pkill", [
		"-f",
		path.join( ui, "dev/agent/.build/miniserver.json" )
	] );
	process.exit( 0 );
};
process.on( "SIGINT", stop );
process.on( "SIGTERM", stop );

await waitFor( "http://127.0.0.1:" + agentPort + "/chat/", 180 );
console.log( "[stack] ready: http://127.0.0.1:" + agentPort + "/chat  (ada or bob, password demo-pass)" );
