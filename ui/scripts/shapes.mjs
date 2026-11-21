/**
 * Builds and serves the project shapes (dev/shapes/<name>: the dev agent with a few files changed), each on its own
 * port and data home, so tests/shapes can open every page of the web app over a real server in each way a project
 * mounts it. The module is copied into each built agent, as a release does, not linked.
 *
 *   node scripts/shapes.mjs            build, serve, and keep serving until stopped (what Playwright starts)
 *   node scripts/shapes.mjs --no-build serve what was built
 *
 * Writes .stack/shapes.json: [ { name, port, base, apiBase, env } ] for the tests. UI_SHAPES_PORT moves the first port
 * (8791; the next shapes take the ports after it).
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname( fileURLToPath( import.meta.url ) );
const ui = path.resolve( here, ".." );
const repo = path.resolve( ui, ".." );
const stackDir = path.join( ui, ".stack" );
const shapesDir = path.join( ui, "dev/shapes" );
const firstPort = Number( process.env.UI_SHAPES_PORT || 8791 );
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

const classPath = [
	process.env.BOXLANG_JAR || newestJar( "boxlang" ),
	path.join( repo, "build/classes/java/main" )
].join( path.delimiter );

// serve looks for boxlang-miniserver on the PATH (see stack.mjs)
const binDir = path.join( stackDir, "bin" );
fs.mkdirSync( binDir, { recursive: true } );
if ( !( process.env.PATH || "" ).split( path.delimiter ).some( d => fs.existsSync( path.join( d, "boxlang-miniserver" ) ) ) ) {
	fs.writeFileSync( path.join( binDir, "boxlang-miniserver" ), "#!/bin/sh\nexec java -jar \"" + newestJar( "boxlang-miniserver" ) + "\" \"$@\"\n", { mode: 0o755 } );
}

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

/**
 * @param {string} gateway The text of a shape's gateways/chat.bx
 * @returns {string} The path the web app is mounted at
 */
const mountOf = gateway => ( gateway.match( /path\s*:\s*"([^"]+)"/ ) || [
	"",
	"/chat"
] )[ 1 ];

/**
 * @param {string} yaml The text of Agent.yaml
 * @returns {string} The path of the agent API
 */
const apiOf = yaml => ( yaml.match( /^agentApi:\n(?:[ ]{2}.*\n)*?[ ]{2}path:\s*(\S+)/m ) || [
	"",
	"/__bxagents"
] )[ 1 ];

const shapes = fs.readdirSync( shapesDir ).filter( n => fs.existsSync( path.join( shapesDir, n, "shape.json" ) ) ).sort().map( ( name, i ) => {
	const spec = JSON.parse( fs.readFileSync( path.join( shapesDir, name, "shape.json" ), "utf8" ) );
	const root = path.join( stackDir, "shapes", name );
	const project = path.join( root, "project" );
	return { name, spec, root, project, home: path.join( root, "home" ), port: firstPort + i };
} );

for ( const shape of shapes ) {
	if ( build ) {
		// the dev agent, then the shape's own files over it, then its Agent.yaml changes
		fs.rmSync( shape.project, { recursive: true, force: true } );
		fs.cpSync( path.join( ui, "dev/agent" ), shape.project, { recursive: true, filter: src => !src.includes( `${ path.sep }.build` ) } );
		fs.cpSync( path.join( shapesDir, shape.name ), shape.project, { recursive: true, filter: src => !src.endsWith( "shape.json" ) } );
		let yaml = fs.readFileSync( path.join( shape.project, "Agent.yaml" ), "utf8" );
		for ( const [
			from,
			to
		] of shape.spec.agentYaml || [] ) {
			if ( !yaml.includes( from ) ) {
				throw new Error( "[shapes] " + shape.name + ": Agent.yaml has no [" + from + "]" );
			}
			yaml = yaml.replace( from, to );
		}
		fs.writeFileSync( path.join( shape.project, "Agent.yaml" ), yaml );
	}
	shape.base = mountOf( fs.readFileSync( path.join( shape.project, "gateways/chat.bx" ), "utf8" ) );
	shape.apiBase = apiOf( fs.readFileSync( path.join( shape.project, "Agent.yaml" ), "utf8" ) );
	shape.env = {
		...process.env,
		...( shape.spec.env || {} ),
		PATH                : binDir + path.delimiter + ( process.env.PATH || "" ),
		BXAGENTS_HOME       : shape.home,
		BXAGENTS_PUBLIC_URL : "http://127.0.0.1:" + shape.port,
		// copied, as a release installs it: the shapes check what a built agent really gets
		BXAGENTS_UI_LINK    : "false",
		BXAGENTS_UI_SOURCE  : path.join( repo, "src/main/bx/bxagentsui" )
	};
	if ( build ) {
		console.log( "[shapes] building " + shape.name );
		const done = spawnSync( "java", boxlang( [
			"module:bxagents",
			"build",
			"--projectRoot=" + shape.project
		] ), { cwd: repo, env: shape.env, stdio: "inherit" } );
		if ( done.status !== 0 ) {
			process.exit( done.status || 1 );
		}
	}
}

const children = shapes.map( shape => {
	const child = spawn( "java", boxlang( [
		"module:bxagents",
		"serve",
		"--projectRoot=" + shape.project,
		"--port=" + shape.port
	] ), {
		cwd   : repo,
		env   : shape.env,
		stdio : [
			"ignore",
			"pipe",
			"pipe"
		]
	} );
	/**
	 * @param {string} line One line the shape's server printed
	 * @returns {boolean|void} Prints it with the shape's name, unless it is empty
	 */
	const say = line => line.length && console.log( "[" + shape.name + "] " + line );
	child.stdout.on( "data", d => String( d ).split( "\n" ).forEach( say ) );
	child.stderr.on( "data", d => String( d ).split( "\n" ).forEach( say ) );
	return child;
} );

fs.writeFileSync( path.join( stackDir, "shapes.json" ), JSON.stringify( shapes.map( s => ( {
	name    : s.name,
	port    : s.port,
	base    : s.base,
	apiBase : s.apiBase,
	env     : s.spec.env || {}
} ) ), null, 2 ) );

/**
 * @param {string} url What to ask
 * @param {number} seconds How long to keep trying
 * @returns {Promise<void>} Resolves once the address answers below 500
 */
async function waitFor( url, seconds ) {
	for ( let i = 0; i < seconds; i++ ) {
		try {
			const res = await fetch( url, { redirect: "manual" } );
			if ( res.status < 500 ) {
				return;
			}
		} catch {
			// not up yet
		}
		await new Promise( r => setTimeout( r, 1000 ) );
	}
	throw new Error( "[shapes] " + url + " did not answer" );
}

/** Stops every shape's server this script started. */
const stop = () => children.forEach( c => c.kill() );
process.on( "SIGINT", () => {
	stop();
	process.exit( 0 );
} );
process.on( "SIGTERM", () => {
	stop();
	process.exit( 0 );
} );

for ( const shape of shapes ) {
	await waitFor( "http://127.0.0.1:" + shape.port + shape.base + "/", 240 );
}
// Playwright waits on this address: it answers once every shape does
const { createServer } = await import( "node:http" );
createServer( ( req, res ) => res.end( "ready" ) ).listen( firstPort - 1, "127.0.0.1" );
console.log( "[shapes] ready: " + shapes.map( s => s.name + " http://127.0.0.1:" + s.port + s.base ).join( ", " ) );
