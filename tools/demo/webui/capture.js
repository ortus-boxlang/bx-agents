/**
 * Drives the demo web UI with Playwright: records the walkthrough video and the doc screenshots.
 * Each scene lasts as long as its narration (out/<id>.json from narrate.bxs), so audio and picture line up.
 *
 *   NODE_PATH=$(npm root -g) node capture.js --url=http://127.0.0.1:8780/chat --out=out
 *
 * Writes out/shots/*.png, out/walkthrough.webm and out/timeline.json ({ id, startMs, endMs } per scene).
 */
const { chromium } = require( "playwright" );
const fs = require( "fs" );
const args = Object.fromEntries( process.argv.slice( 2 ).map( a => a.replace( /^--/, "" ).split( "=" ) ) );
const base = args.url || "http://127.0.0.1:8780/chat";
const out = args.out || "out";
const shots = out + "/shots";
fs.mkdirSync( shots, { recursive: true } );
const scenes = JSON.parse( fs.readFileSync( __dirname + "/scenes.json", "utf8" ) )
	.map( s => ( { ...s, seconds: JSON.parse( fs.readFileSync( out + "/" + s.id + ".json", "utf8" ) ).seconds } ) );
const sleep = ms => new Promise( r => setTimeout( r, ms ) );

( async () => {
	const browser = await chromium.launch();
	const ctx = await browser.newContext( { viewport: { width: 1280, height: 800 }, recordVideo: { dir: out + "/raw", size: { width: 1280, height: 800 } } } );
	const p = await ctx.newPage();
	const t0 = Date.now();
	const timeline = [];
	const shot = name => p.screenshot( { path: shots + "/" + name + ".png" } );
	const ask = async text => {
		await p.click( "#input" );
		await p.type( "#input", text, { delay: 45 } );
		await sleep( 400 );
		await p.click( "#sendBtn" );
		await p.waitForSelector( "#sendBtn:not([disabled])", { timeout: 30000 } ).catch( () => {} );
		await sleep( 1200 );
	};
	const done = async () => { await p.waitForFunction( () => !document.querySelector( "#stopBtn:not([hidden])" ), null, { timeout: 30000 } ).catch( () => {} ); };

	const actions = {
		async intro() {
			await p.goto( base + "/login.html" );
			await sleep( 1500 );
			await shot( "login" );
			await p.type( "input[name=username]", "ada", { delay: 120 } );
			await p.type( "input[name=password]", "demo-pass", { delay: 120 } );
			await shot( "login-filled" );
		},
		async home() {
			await Promise.all( [ p.waitForNavigation().catch( () => {} ), p.click( "button[type=submit]" ) ] );
			await p.waitForSelector( "#profileSelect:not([hidden])", { timeout: 15000 } ).catch( () => {} );
			await sleep( 1200 );
			await shot( "home" );
		},
		async stream() {
			await ask( "What is your return policy?" );
			await done();
			await shot( "streaming-answer" );
			await ask( "Where is my order?" );
			await done();
			await shot( "markdown-list" );
		},
		async picker() {
			await p.selectOption( "#profileSelect", "planner" ).catch( () => {} );
			await sleep( 800 );
			await shot( "model-picker" );
			await ask( "How long does shipping take?" );
			await done();
			await shot( "planner-answer" );
		},
		async tool() {
			await p.selectOption( "#profileSelect", "fast" ).catch( () => {} );
			await ask( "Are you open right now?" );
			await done();
			await p.locator( "details.tool" ).first().click().catch( () => {} );
			await sleep( 600 );
			await shot( "tool-call" );
		},
		async history() {
			await p.click( "#newBtn" );
			await sleep( 800 );
			await ask( "Do you ship abroad?" );
			await done();
			const open = await p.$eval( "#sidebar", el => !el.hidden ).catch( () => true );
			if ( !open ) { await p.click( "#sidebarBtn" ); await sleep( 500 ); }
			await sleep( 1800 );
			await shot( "conversations" );
		},
		async notes() {
			await p.click( "#notesBtn" );
			await sleep( 900 );
			await p.type( "#notesInput", "Prefers email over phone", { delay: 60 } );
			await shot( "notes-typing" );
			await p.keyboard.press( "Enter" ).catch( () => {} );
			await sleep( 900 );
			await shot( "notes" );
			await p.click( "#notesClose" ).catch( () => {} );
		},
		async theme() {
			await p.click( "#themeBtn" );
			await sleep( 1200 );
			await shot( "dark-theme" );
		},
		async outro() { await sleep( 600 ); }
	};

	for ( const s of scenes ) {
		const startMs = Date.now() - t0;
		await actions[ s.id ]();
		const need = s.seconds * 1000 + 600;
		const spent = Date.now() - t0 - startMs;
		if ( spent < need ) await sleep( need - spent );
		else console.warn( s.id + ": actions ran " + ( spent - need ) + " ms longer than the narration" );
		timeline.push( { id: s.id, startMs, endMs: Date.now() - t0, seconds: s.seconds } );
	}
	fs.writeFileSync( out + "/timeline.json", JSON.stringify( timeline, null, 2 ) );
	const video = p.video();
	await ctx.close();
	fs.renameSync( await video.path(), out + "/walkthrough.webm" );
	await browser.close();
	console.log( JSON.stringify( timeline.map( t => t.id + " " + t.startMs ) ) );
} )();
