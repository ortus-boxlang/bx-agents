/**
 * Records the embeds tour: screenshots and a narrated video of an admin making an embed and a visitor chatting from another
 * website. Run it against a served agent with the demo model (see README.md), after the narration is made:
 *
 *   node tools/demo/embeds/record.mjs <narration-wav-folder> <out-folder>
 *
 * Environment: AGENT (default http://127.0.0.1:9301), ADMIN_KEY (the agent's admin token, default admin-secret),
 * SITE_PORT (the "other website", default 9100), CHROME (a chrome binary, optional).
 *
 * Each scene is held at least as long as its narration. The scene start times are written to the audio track, so the voice
 * lines up with what is on the screen. The voice is the one of every demo video of this repo (tools/demo/narration).
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const [ wavDir, outDir ] = process.argv.slice( 2 );
if ( !wavDir || !outDir ) {
	console.error( "usage: node record.mjs <narration-wav-folder> <out-folder>" );
	process.exit( 2 );
}
const AGENT = process.env.AGENT || "http://127.0.0.1:9301";
const KEY = process.env.ADMIN_KEY || "admin-secret";
const SITE_PORT = Number( process.env.SITE_PORT || 9100 );
const SITE = "http://127.0.0.1:" + SITE_PORT;
const narration = JSON.parse( fs.readFileSync( new URL( "./narration.json", import.meta.url ) ) );
const size = { width: 1280, height: 800 };
fs.rmSync( outDir, { recursive: true, force: true } );
fs.mkdirSync( path.join( outDir, "raw" ), { recursive: true } );

/**
 * @param {string} file A wav file
 * @returns {number} Its length in milliseconds
 */
function lengthOf( file ) {
	return Math.round( Number( execFileSync( "ffprobe", [ "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file ] ).toString() ) * 1000 );
}

/**
 * The "other website": a documentation page with the snippet the Embeds page gives, whose embed id is set once it is known.
 *
 * @param {() => string} embedId The embed's id
 * @returns {Promise<http.Server>} The server
 */
function docsSite( embedId ) {
	return new Promise( resolve => {
		const server = http.createServer( ( req, res ) => {
			res.setHeader( "Content-Type", "text/html" );
			res.end( `<!doctype html><meta charset="utf-8"><title>Acme docs</title>
<body style="margin:0;font-family:system-ui,sans-serif;color:#0f172a;background:#f8fafc">
<header style="background:#0f172a;color:#fff;padding:18px 48px;font-weight:600;font-size:20px">Acme docs</header>
<main style="max-width:720px;margin:48px auto;padding:0 24px;line-height:1.6">
<h1 style="margin-top:0">Getting started</h1>
<p>Install the module, then build your first agent. Tokens are made from the terminal. If you cannot find what you need, ask the chat in the corner.</p>
<h2>Install</h2><pre style="background:#e2e8f0;padding:14px;border-radius:8px">install-bx-module bx-agents</pre>
<h2>Tokens</h2><pre style="background:#e2e8f0;padding:14px;border-radius:8px">bxAgents token create --name=laptop</pre>
</main>
<script src="${ AGENT }/__bxagents/embed/widget.js" data-embed="${ embedId() }" defer></script></body>` );
		} ).listen( SITE_PORT, "127.0.0.1", () => resolve( server ) );
	} );
}

let embedId = "";
const site = await docsSite( () => embedId );
const browser = await chromium.launch( process.env.CHROME ? { executablePath: process.env.CHROME } : {} );
const context = await browser.newContext( {
	viewport          : size,
	deviceScaleFactor : 2,
	recordVideo       : { dir: path.join( outDir, "raw" ), size }
} );
await context.grantPermissions( [ "clipboard-read", "clipboard-write" ], { origin: AGENT } );
await context.addInitScript( ( { key, origin } ) => {
	// the web app asks for the agent's key once; keep it for the agent's own origin only
	if ( location.origin === origin ) {
		try { localStorage.setItem( "bxagents_webui_api_key", key ); } catch { /* storage blocked */ }
	}
	// a visible pointer, so a viewer sees what is clicked
	addEventListener( "DOMContentLoaded", () => {
		const dot = document.createElement( "div" );
		dot.id = "bx-pointer";
		dot.style.cssText = "position:fixed;z-index:2147483647;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(124,58,237,.45);border:2px solid #7c3aed;pointer-events:none;transition:transform .08s;left:-50px;top:-50px";
		document.documentElement.appendChild( dot );
		addEventListener( "mousemove", e => { dot.style.left = e.clientX + "px"; dot.style.top = e.clientY + "px"; }, true );
		addEventListener( "mousedown", () => { dot.style.transform = "scale(.7)"; }, true );
		addEventListener( "mouseup", () => { dot.style.transform = "scale(1)"; }, true );
	} );
}, { key: KEY, origin: new URL( AGENT ).origin } );
const page = await context.newPage();
const started = Date.now();
const pause = ms => page.waitForTimeout( ms );

let shots = 0;
/**
 * @param {string} label What the picture shows
 */
async function shot( label ) {
	shots++;
	// the pointer is for the video: a still looks better without it
	const pointer = visible => page.evaluate( v => { const d = document.getElementById( "bx-pointer" ); if ( d ) { d.style.visibility = v ? "visible" : "hidden"; } }, visible );
	await pointer( false );
	await page.screenshot( { path: path.join( outDir, String( shots ).padStart( 2, "0" ) + "-" + label + ".png" ) } );
	await pointer( true );
}

/**
 * Moves the pointer to an element and clicks it, so the click can be seen.
 *
 * @param {import("playwright").Locator} locator The element
 */
async function click( locator ) {
	await locator.scrollIntoViewIfNeeded();
	const box = await locator.boundingBox();
	await page.mouse.move( box.x + box.width / 2, box.y + box.height / 2, { steps: 18 } );
	await pause( 180 );
	await locator.click();
}

const scenes = [];
/**
 * Runs one scene and holds it at least as long as its narration.
 *
 * @param {string} name The scene, a key of narration.json
 * @param {() => Promise<void>} actions What happens on screen
 */
async function scene( name, actions ) {
	const at = Date.now() - started;
	const wav = path.join( wavDir, name + ".wav" );
	const length = lengthOf( wav );
	await actions();
	const spent = Date.now() - started - at;
	if ( spent < length + 500 ) {
		await pause( length + 500 - spent );
	}
	scenes.push( { name, wav, at, length, end: Date.now() - started } );
	console.log( name, "starts at", ( at / 1000 ).toFixed( 1 ), "s, narration", ( length / 1000 ).toFixed( 1 ), "s, scene", ( ( Date.now() - started - at ) / 1000 ).toFixed( 1 ), "s" );
}

await page.goto( AGENT + "/chat/embeds" );
await page.getByRole( "heading", { name: "Embeds", level: 1 } ).waitFor();

await scene( "intro", async() => {
	await pause( 800 );
	await shot( "embeds-empty" );
} );

await scene( "define", async() => {
	await click( page.locator( "#newEmbed" ) );
	await pause( 500 );
	await click( page.locator( "#embedName" ) );
	await page.locator( "#embedName" ).pressSequentially( "Docs helper", { delay: 70 } );
	await click( page.locator( "#embedTitle" ) );
	await page.locator( "#embedTitle" ).pressSequentially( "Ask the docs", { delay: 70 } );
	await click( page.locator( "#embedWelcome" ) );
	await page.locator( "#embedWelcome" ).pressSequentially( "Hi! Ask me anything about the docs.", { delay: 45 } );
	await click( page.locator( "#embedSuggestion" ) );
	await page.locator( "#embedSuggestion" ).pressSequentially( "How do I install it?", { delay: 50 } );
	await page.keyboard.press( "Enter" );
	await page.locator( "#embedColor" ).fill( "#7c3aed" );
	await pause( 400 );
	// typing scrolled the page down: the picture starts at its heading
	await page.evaluate( () => { document.querySelector( "#content" )?.scrollTo( 0, 0 ); window.scrollTo( 0, 0 ); } );
	await pause( 300 );
	await shot( "editor-with-live-preview" );
} );

await scene( "limits", async() => {
	await click( page.locator( "label.check", { hasText: "docs_search" } ).locator( "input" ) );
	await pause( 600 );
	await shot( "tools-visitors-can-use" );
	await click( page.locator( "#embedOrigin" ) );
	await page.locator( "#embedOrigin" ).pressSequentially( "https://*.example.com", { delay: 55 } );
	await click( page.locator( "#addOrigin" ) );
	await pause( 900 );
	await shot( "wildcard-refused" );
	await page.locator( "#embedOrigin" ).fill( "" );
	await page.locator( "#embedOrigin" ).pressSequentially( SITE, { delay: 55 } );
	await page.keyboard.press( "Enter" );
	await pause( 700 );
} );

await scene( "snippet", async() => {
	await click( page.locator( "#saveEmbed" ) );
	await page.getByText( "Made Docs helper." ).waitFor();
	// saving a new embed keeps the page, now as the edit of the embed it made
	await page.getByRole( "heading", { name: "Edit Docs helper", level: 1 } ).waitFor();
	await pause( 700 );
	embedId = ( await page.locator( "[role=tabpanel]:visible code" ).textContent() ).match( /emb_[A-Za-z0-9]{10}/ )[ 0 ];
	await pause( 500 );
	await click( page.getByRole( "tab", { name: "iframe" } ) );
	await pause( 700 );
	await click( page.getByRole( "tab", { name: "HTML" } ) );
	await click( page.getByRole( "button", { name: "Copy the HTML snippet" } ) );
	await pause( 600 );
	await shot( "snippet-and-copy" );
} );

await scene( "visitor", async() => {
	await page.goto( SITE + "/" );
	await page.locator( "bx-agent .launcher" ).waitFor( { state: "visible" } );
	await pause( 900 );
	await shot( "visitor-site-with-bubble" );
	await click( page.locator( "bx-agent .launcher" ) );
	await pause( 700 );
	await click( page.locator( "bx-agent .suggestions button" ).first() );
	await pause( 2200 );
	await shot( "answer-streaming" );
	await page.locator( "bx-agent .send" ).filter( { hasText: "Send" } ).waitFor( { timeout: 30_000 } );
	await pause( 600 );
	await shot( "visitor-answer" );
} );

await scene( "counters", async() => {
	await page.goto( AGENT + "/chat/embeds" );
	await click( page.getByRole( "link", { name: "Edit Docs helper" } ).first() );
	await page.getByRole( "heading", { name: "Last 7 days" } ).waitFor();
	await pause( 900 );
	await page.getByRole( "heading", { name: "Last 7 days" } ).scrollIntoViewIfNeeded();
	await shot( "counters" );
	await click( page.locator( "#rotateEmbed" ) );
	await pause( 900 );
	await shot( "rotate-asks-first" );
	await click( page.locator( "#confirmYes" ) );
	await pause( 1200 );
	await click( page.locator( "#backToEmbeds" ) );
	await page.getByRole( "heading", { name: "Embeds", level: 1 } ).waitFor();
	await pause( 700 );
} );

await scene( "list", async() => {
	await shot( "list" );
	await click( page.locator( "#embedSearch" ) );
	await page.locator( "#embedSearch" ).pressSequentially( "docs", { delay: 90 } );
	await pause( 600 );
	await click( page.getByRole( "button", { name: /^On/ } ) );
	await pause( 700 );
	await shot( "list-filtered" );
	await click( page.getByRole( "button", { name: /^All/ } ) );
	await click( page.locator( "tbody tr" ).filter( { hasText: "Docs helper" } ).locator( ".switch" ) );
	await page.getByText( "Docs helper is off." ).waitFor();
	await pause( 900 );
	await shot( "switched-off" );
	await click( page.getByRole( "button", { name: "Delete Docs helper" } ) );
	await pause( 900 );
	await shot( "delete-asks-first" );
	await click( page.locator( "#confirmNo" ) );
	await pause( 500 );
} );

await scene( "outro", async() => {
	await page.goto( SITE + "/" );
	await pause( 2500 );
	await shot( "site-after-disable" );
} );

await context.close();
const raw = fs.readdirSync( path.join( outDir, "raw" ) ).find( f => f.endsWith( ".webm" ) );
await browser.close();
site.close();

// the audio: every scene's narration, started where its scene started
const inputs = scenes.flatMap( s => [ "-i", s.wav ] );
const delays = scenes.map( ( s, i ) => `[${ i + 1 }:a]adelay=${ s.at + 250 }|${ s.at + 250 }[a${ i }]` ).join( ";" );
const mix = scenes.map( ( s, i ) => `[a${ i }]` ).join( "" ) + `amix=inputs=${ scenes.length }:normalize=0[aout]`;
const video = path.join( outDir, "raw", raw );
const common = [ "-y", "-v", "error", "-i", video, ...inputs, "-filter_complex", delays + ";" + mix, "-map", "0:v", "-map", "[aout]" ];
execFileSync( "ffmpeg", [ ...common, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "24", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", path.join( outDir, "embeds-tour.mp4" ) ] );
execFileSync( "ffmpeg", [ ...common, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "36", "-c:a", "libopus", "-b:a", "64k", path.join( outDir, "embeds-tour.webm" ) ] );

// captions, from the same text and times
const stamp = ms => new Date( ms ).toISOString().slice( 11, 23 );
fs.writeFileSync( path.join( outDir, "embeds-tour.vtt" ), "WEBVTT\n\n" + scenes.map( s => `${ stamp( s.at + 250 ) } --> ${ stamp( s.at + 250 + s.length ) }\n${ narration[ s.name ] }\n` ).join( "\n" ) );
console.log( "done", ( scenes.at( -1 ).end / 1000 ).toFixed( 1 ), "s of video" );
