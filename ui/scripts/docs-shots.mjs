/**
 * Retakes every web UI screenshot in the docs from the trailer's demo agent (tools/demo/webui/trailer/project), in one
 * command. It copies the demo agent to ui/.stack/docshots, builds it with this repository's own bxAgents, serves it with
 * a fresh data home and the scripted model, seeds it (seed.js: conversations, notes, vault, routines, tokens, a backup),
 * runs tools/demo/webui/screens.js, and stops everything. Nothing needs a key or the network.
 *
 *   npm run docs:shots                 every shot, written to ../docs/assets
 *   npm run docs:shots -- --only=webui/webui-chat,webui/login
 *   npm run docs:shots -- --keep       seed the demo app and leave it running, to look at it or to try a shot
 *
 * Needs ./gradlew downloadBoxLang shadowJar first (as for npm run stack) and a Playwright Chromium.
 * Environment: DOCSHOTS_AGENT_PORT (8791) and DOCSHOTS_LLM_PORT (8080) move the ports.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ui = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), ".." );
const repo = path.resolve( ui, ".." );
const work = path.join( ui, ".stack/docshots" );
const demo = path.join( repo, "tools/demo/webui" );
const agentPort = Number( process.env.DOCSHOTS_AGENT_PORT || 8791 );
const llmPort = Number( process.env.DOCSHOTS_LLM_PORT || 8080 );
const pass = process.argv.slice( 2 );

/**
 * @param {string} prefix The file name start
 * @returns {string} The newest jar in src/test/resources/libs that starts with the prefix and a version
 */
function newestJar( prefix ) {
	const dir = path.join( repo, "src/test/resources/libs" );
	const found = fs.existsSync( dir ) ? fs.readdirSync( dir ).filter( f => new RegExp( "^" + prefix + "-\\d.*\\.jar$" ).test( f ) ).sort() : [];
	if ( !found.length ) {
		throw new Error( "No " + prefix + " jar in " + dir + ". Run ./gradlew downloadBoxLang shadowJar first." );
	}
	return path.join( dir, found[ found.length - 1 ] );
}

fs.rmSync( work, { recursive: true, force: true } );
const project = path.join( work, "project" );
const home = path.join( work, "home" );
fs.mkdirSync( home, { recursive: true } );
fs.cpSync( path.join( demo, "trailer/project" ), project, { recursive: true } );
// a service that needs a sign in (tools/demo/fake-oauth-mcp.bxs), so the Connectors page has one to connect
const mailPort = Number( process.env.DOCSHOTS_MAIL_PORT || 9300 );
fs.appendFileSync( path.join( project, "Agent.yml" ), "\nmcpServers:\n  - name: mail\n    url: http://127.0.0.1:" + mailPort + "/mcp\n    oauth:\n      scopes: [ mail.read ]\n" );
// the skills are copied into the data home so the Registry shows them as the agent's own
fs.cpSync( path.join( project, "skills" ), path.join( home, "skills" ), { recursive: true } );

const binDir = path.join( work, "bin" );
fs.mkdirSync( binDir, { recursive: true } );
fs.writeFileSync( path.join( binDir, "boxlang-miniserver" ), "#!/bin/sh\nexec java -jar \"" + newestJar( "boxlang-miniserver" ) + "\" \"$@\"\n", { mode: 0o755 } );
const hot = path.join( repo, "src/main/bx/bxagentsui/includes/hot" );
if ( fs.existsSync( hot ) ) {
	fs.rmSync( hot );
}
const url = "http://127.0.0.1:" + agentPort;
const env = {
	...process.env,
	PATH                : binDir + path.delimiter + ( process.env.PATH || "" ),
	BXAGENTS_HOME       : home,
	BXAGENTS_PUBLIC_URL : url,
	TRAILER_ADMIN_TOKEN : "docshots-admin-token",
	NODE_PATH           : path.join( ui, "node_modules" )
};
const boxlang = args => [
	"-cp",
	[
		newestJar( "boxlang" ),
		path.join( repo, "build/classes/java/main" )
	].join( path.delimiter ),
	"ortus.boxlang.runtime.BoxRunner",
	"--bx-config",
	path.join( repo, "boxlang.json" ),
	...args
];

console.log( "[docs-shots] building the demo agent" );
const built = spawnSync( "java", boxlang( [
	"module:bxagents",
	"build",
	"--projectRoot=" + project
] ), { cwd: repo, env, stdio: "inherit" } );
if ( built.status !== 0 ) {
	process.exit( built.status || 1 );
}

const children = [];
const start = ( name, args ) => {
	const child = spawn( "java", args, {
		cwd   : repo,
		env,
		stdio : [
			"ignore",
			"pipe",
			"pipe"
		]
	} );
	const log = fs.createWriteStream( path.join( work, name + ".log" ) );
	child.stdout.pipe( log );
	child.stderr.pipe( log );
	children.push( child );
	return child;
};
const stop = () => {
	children.forEach( c => c.kill() );
	spawnSync( "pkill", [
		"-f",
		path.join( project, ".build/miniserver.json" )
	] );
};
process.on( "SIGINT", () => {
	stop();
	process.exit( 130 );
} );

const waitFor = async( address, seconds ) => {
	const until = Date.now() + seconds * 1000;
	while ( Date.now() < until ) {
		try {
			if ( ( await fetch( address ) ).status < 500 ) {
				return;
			}
		} catch {
			// not up yet
		}
		await new Promise( r => setTimeout( r, 500 ) );
	}
	throw new Error( address + " did not answer in " + seconds + "s" );
};
const node = ( script, args ) => spawnSync( "node", [
	script,
	...args
], { cwd: demo, env, stdio: "inherit" } ).status;

let status = 1;
try {
	start( "model", boxlang( [
		path.join( repo, "tools/demo/fakellm.bxs" ),
		"--port=" + llmPort,
		"--script=" + path.join( demo, "trailer/model.json" )
	] ) );
	start( "mail", boxlang( [
		path.join( repo, "tools/demo/fake-oauth-mcp.bxs" ),
		"--port=" + mailPort
	] ) );
	start( "agent", boxlang( [
		"module:bxagents",
		"serve",
		"--projectRoot=" + project,
		"--port=" + agentPort
	] ) );
	await waitFor( url + "/chat/", 240 );
	console.log( "[docs-shots] seeding" );
	if ( node( path.join( demo, "trailer/seed.js" ), [ "--url=" + url ] ) !== 0 ) {
		throw new Error( "the seed failed" );
	}
	if ( pass.includes( "--keep" ) ) {
		console.log( "[docs-shots] kept running at " + url + "/chat (ada, demo-pass). Ctrl+C stops it." );
		await new Promise( () => {} );
	}
	console.log( "[docs-shots] taking the shots" );
	status = node( path.join( demo, "screens.js" ), [
		"--url=" + url,
		"--out=" + path.join( repo, "docs/assets" ),
		"--mask=" + home,
		...pass
	] );
} catch ( e ) {
	console.error( e.message );
} finally {
	stop();
}
process.exit( status || 0 );
