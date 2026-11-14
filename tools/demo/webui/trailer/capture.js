/**
 * Drives the demo web UI with Playwright and records the trailer. Each scene lasts as long as its narration (out/<id>.json from
 * narrate.py), and every action is placed at a fraction of that time with `at()`, so the picture shows what the voice says.
 *
 *   NODE_PATH=$(npm root -g) node capture.js --url=http://127.0.0.1:8791 --out=out [--terminal=out/terminal.txt]
 *
 * Writes out/shots/*.png, out/picture.mp4 (the page's own screencast, every frame stamped, so the picture is exactly as long as the timeline) and out/timeline.json ({ id, startMs, endMs, seconds } per scene).
 * Run it as the admin account of the demo app (ada, password demo-pass) on a seeded app (seed.js).
 */
const { chromium } = require( "playwright" );
const fs = require( "fs" );
const args = Object.fromEntries( process.argv.slice( 2 ).map( a => a.replace( /^--/, "" ).split( "=" ) ) );
const base = ( args.url || "http://127.0.0.1:8791" ).replace( /\/$/, "" );
const app = base + "/chat/";
const out = args.out || "out";
const shots = out + "/shots";
fs.mkdirSync( shots, { recursive: true } );
const scenes = JSON.parse( fs.readFileSync( __dirname + "/scenes.json", "utf8" ) )
	.map( s => ( { ...s, seconds: JSON.parse( fs.readFileSync( out + "/" + s.id + ".json", "utf8" ) ).seconds } ) );
const terminalText = fs.existsSync( args.terminal || out + "/terminal.txt" ) ? fs.readFileSync( args.terminal || out + "/terminal.txt", "utf8" ) : "";
const sleep = ms => new Promise( r => setTimeout( r, ms ) );
const LEAD = 300;      // the voice starts this long after the scene does (mix.bxs `lead`)
const TAIL = 700;      // quiet at the end of a scene

// A cursor dot, since a recording shows none, and the scene caption as a pill at the top
const overlay = () => {
	const start = () => {
		if ( document.getElementById( "__cur" ) || !document.body ) { return; }
		const st = document.createElement( "style" );
		st.textContent = "#__cur{position:fixed;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(20,20,20,.35);border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.5);z-index:2147483647;pointer-events:none;transition:transform .05s linear,width .12s,height .12s,margin .12s}"
			+ "#__cur.dn{width:30px;height:30px;margin:-15px 0 0 -15px;background:rgba(15,118,110,.55)}"
			+ "#__cap{position:fixed;left:50%;top:14px;transform:translate(-50%,-8px);opacity:0;z-index:2147483646;pointer-events:none;background:rgba(12,18,24,.86);color:#fff;font:600 15px/1.2 Inter,system-ui,sans-serif;padding:9px 18px;border-radius:999px;letter-spacing:.01em;transition:opacity .35s,transform .35s;white-space:nowrap;box-shadow:0 4px 18px rgba(0,0,0,.3)}"
			+ "#__cap.on{opacity:1;transform:translate(-50%,0)}";
		document.head.appendChild( st );
		const cur = document.createElement( "div" ); cur.id = "__cur"; cur.style.transform = "translate(-60px,-60px)"; document.body.appendChild( cur );
		const cap = document.createElement( "div" ); cap.id = "__cap"; document.body.appendChild( cap );
		window.addEventListener( "mousemove", e => { cur.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)"; }, true );
		window.addEventListener( "mousedown", () => cur.classList.add( "dn" ), true );
		window.addEventListener( "mouseup", () => cur.classList.remove( "dn" ), true );
		let shown = "";
		setInterval( () => {
			let want = ""; try { want = window.top.sessionStorage.getItem( "__trailerCaption" ) || ""; } catch ( e ) { want = sessionStorage.getItem( "__trailerCaption" ) || ""; }
			if ( window.top !== window ) { cap.style.display = "none"; return; }
			if ( want === shown ) { return; }
			shown = want;
			if ( !want ) { cap.classList.remove( "on" ); return; }
			cap.classList.remove( "on" );
			setTimeout( () => { cap.textContent = want; cap.classList.add( "on" ); }, 180 );
		}, 120 );
	};
	if ( document.readyState === "loading" ) { document.addEventListener( "DOMContentLoaded", start ); } else { start(); }
};

( async () => {
	const browser = await chromium.launch( { args: [ "--trace", "off" ] } ).catch( () => chromium.launch() );
	const ctx = await browser.newContext( { viewport: { width: 1280, height: 800 } } );
	ctx.setDefaultTimeout( 4000 );
	await ctx.addInitScript( overlay );
	const p = await ctx.newPage();
	// The picture is the page's own screencast, each frame stamped with the time the browser drew it. Playwright's recordVideo drifts
	// (about 7 percent slow under load), which would put the voice out of step with the scenes; stamped frames cannot.
	const frames = [];
	fs.rmSync( out + "/frames", { recursive: true, force: true } );
	fs.mkdirSync( out + "/frames", { recursive: true } );
	const cdp = await ctx.newCDPSession( p );
	cdp.on( "Page.screencastFrame", async f => {
		const n = frames.length;
		frames.push( { ts: f.metadata.timestamp * 1000, file: "f" + String( n ).padStart( 6, "0" ) + ".jpg" } );
		fs.writeFileSync( out + "/frames/" + frames[ n ].file, Buffer.from( f.data, "base64" ) );
		cdp.send( "Page.screencastFrameAck", { sessionId: f.sessionId } ).catch( () => {} );
	} );
	await p.goto( app + "login.html" );
	await cdp.send( "Page.startScreencast", { format: "jpeg", quality: 88, everyNthFrame: 1 } );
	await sleep( 300 );
	const t0 = Date.now();
	const timeline = [];
	let sceneStart = 0, budget = 0;
	const shot = name => p.screenshot( { path: shots + "/" + name + ".png" } );
	/** a screenshot without the caption pill (the poster) */
	const shotClean = async name => {
		await p.evaluate( () => { const c = document.getElementById( "__cap" ); if ( c ) { c.style.visibility = "hidden"; } } );
		await sleep( 400 );
		await shot( name );
		await p.evaluate( () => { const c = document.getElementById( "__cap" ); if ( c ) { c.style.visibility = ""; } } );
	};
	/** wait until `frac` of the scene's narration (after the lead) has passed */
	const at = async frac => { const due = sceneStart + LEAD + frac * ( budget - LEAD ); const wait = due - Date.now(); if ( wait > 0 ) { await sleep( wait ); } };
	let target = p;           // the page, or the phone frame
	const place = async loc => {
		const box = await loc.first().boundingBox( { timeout: 2500 } ).catch( () => null );
		if ( !box ) { return null; }
		return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
	};
	let off = { x: 0, y: 0 };
	/** glide the cursor to an element, then click it */
	const click = async loc => {
		await loc.first().scrollIntoViewIfNeeded( { timeout: 2500 } ).catch( () => {} );
		const c = await place( loc );
		if ( !c ) { console.warn( "click: not found " + loc ); return false; }
		await p.mouse.move( c.x + off.x, c.y + off.y, { steps: 14 } );
		await sleep( 120 );
		await p.mouse.down(); await sleep( 70 ); await p.mouse.up();
		return true;
	};
	const glide = async loc => { const c = await place( loc ); if ( c ) { await p.mouse.move( c.x + off.x, c.y + off.y, { steps: 14 } ); } };
	const typeInto = async ( loc, text, delay = 38 ) => { await click( loc ); await loc.first().pressSequentially( text, { delay } ); };
	const go = async hash => { await p.evaluate( h => { window.location.hash = h; }, hash ); await sleep( 700 ); };
	const scroll = async ( dy, steps = 8 ) => { for ( let i = 0; i < steps; i++ ) { await p.mouse.wheel( 0, dy / steps ); await sleep( 60 ); } };
	const idle = async () => { await p.waitForFunction( () => !document.querySelector( "#stopBtn:not([hidden])" ), null, { timeout: 30000 } ).catch( () => {} ); };
	const ask = async text => {
		await typeInto( p.locator( "#input" ), text, 32 );
		await sleep( 250 );
		await click( p.locator( "#sendBtn" ) );
	};

	// A page of cards drawn by the capture itself (the terminal, the closing card), served on the app's own address so nothing leaves it
	const card = ( title, body ) => `<!doctype html><meta charset=utf-8><title>${title}</title><style>
		body{margin:0;height:100vh;display:grid;place-items:center;background:#0b1217;color:#e8f1f2;font:16px/1.5 Inter,system-ui,sans-serif}
		.term{width:1040px;background:#0f1b22;border:1px solid #23363f;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.5);overflow:hidden}
		.bar{display:flex;gap:8px;padding:12px 16px;background:#16262e}.bar i{width:12px;height:12px;border-radius:50%;background:#35505c;display:block}
		pre{margin:0;padding:22px 26px;font:15px/1.55 "JetBrains Mono",ui-monospace,Menlo,monospace;color:#cfe3e6;white-space:pre-wrap;min-height:560px}
		.p{color:#2dd4bf}.d{color:#7b97a1}
		.end{text-align:center}.end h1{font-size:64px;margin:0 0 6px;letter-spacing:-.02em}.end p{color:#9bb4bb;font-size:22px;margin:0 0 34px}
		.cmd{display:inline-block;font:600 34px "JetBrains Mono",ui-monospace,monospace;color:#05201c;background:#2dd4bf;padding:16px 34px;border-radius:14px}
		.url{margin-top:30px;font-size:22px;color:#cfe3e6}.url b{color:#2dd4bf}
	</style>${body}`;
	await ctx.route( "**/__trailer/terminal", r => r.fulfill( { contentType: "text/html", body: card( "Terminal", `<div class=term><div class=bar><i></i><i></i><i></i></div><pre id=t></pre></div>
		<script>const lines=${JSON.stringify( terminalText )};const t=document.getElementById("t");let i=0;(function tick(){if(i<lines.length){const n=Math.min(lines.length,i+(lines[i]==="\\n"?1:3));t.innerHTML=render(lines.slice(0,n));i=n;setTimeout(tick,14);}})();
		function render(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").split("\\n").map(l=>l.startsWith("$ ")?'<span class=p>$</span> '+l.slice(2):l.startsWith("#")?'<span class=d>'+l+'</span>':l).join("\\n");}</script>` ) } ) );
	await ctx.route( "**/__trailer/end", r => r.fulfill( { contentType: "text/html", body: card( "BxAgents", `<style>#__cap{display:none!important}</style><div class=end><h1>BxAgents</h1><p>An agent, and the whole workplace around it.</p><div class=cmd>bxAgents new</div><div class=url>Docs and source: <b>github.com/ortus-boxlang/bx-agents</b></div></div>` ) } ) );
	await ctx.route( "**/__trailer/phone", r => r.fulfill( { contentType: "text/html", body: card( "Phone", `<style>#__cap{top:auto!important;bottom:16px}.ph{position:relative;width:390px;height:780px;border:12px solid #1c2a31;border-radius:46px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.6);background:#fff}.ph iframe{width:390px;height:780px;border:0}
		.side{position:absolute;left:calc(50% + 260px);top:50%;transform:translateY(-50%);width:300px;color:#cfe3e6;font-size:20px;line-height:1.6}.side b{color:#2dd4bf}</style>
		<div class=ph><iframe id=f src="/chat/#/chat"></iframe></div>
		<div class=side><b>390 px wide</b><br>Menu drawer<br>44 px touch targets<br>Visible focus<br>Skip link</div>` ) } ) );

	const actions = {
		async hook() {
			await at( 0.04 );
			await typeInto( p.locator( "#username" ), "ada", 60 );
			await typeInto( p.locator( "#password" ), "demo-pass", 45 );
			await at( 0.36 );
			await click( p.locator( "button[type=submit]" ) );
			await p.waitForSelector( "#navList a", { timeout: 20000 } ).catch( () => {} );
			await shot( "home" );
			// a quick flick through the pages while the voice names them
			for ( const [ frac, page ] of [ [ 0.46, "conversations" ], [ 0.55, "routines" ], [ 0.64, "registry" ], [ 0.72, "memory" ], [ 0.80, "vault" ], [ 0.88, "agent" ] ] ) {
				await at( frac );
				await click( p.locator( 'a[data-page="' + page + '"]' ) );
			}
		},
		async chat() {
			await go( "#/chat" );
			await p.evaluate( () => { document.querySelector( "#newBtn" )?.click(); } );
			await sleep( 400 );
			await ask( "Are you open right now?" );
			await idle();
			await p.locator( "details.tool" ).first().click().catch( () => {} );
			await shot( "tool-card" );
			await at( 0.50 );
			await ask( "Send me a digest every weekday morning" );
			await p.waitForSelector( ".approval", { timeout: 20000 } ).catch( () => {} );
			await shot( "approval" );
			await shotClean( "poster" );
			await at( 0.82 );
			await click( p.getByRole( "button", { name: "Approve", exact: true } ) );
			await idle();
			await shot( "approved" );
		},
		async talkto() {
			await at( 0.10 );
			await click( p.locator( "#talkSelect" ) );
			await sleep( 300 );
			await p.selectOption( "#talkSelect", "researcher" ).catch( () => {} );
			await sleep( 900 );
			await shot( "talk-to" );
			await at( 0.30 );
			await ask( "Find sources for our shipping times" );
			await idle();
			await at( 0.62 );
			await p.selectOption( "#talkSelect", "writer" ).catch( () => {} );
			await sleep( 600 );
			await ask( "Draft a reply to Sam about order 48213" );
			await idle();
			await shot( "talk-writer" );
		},
		async conversations() {
			await go( "#/conversations" );
			await at( 0.25 );
			await typeInto( p.getByLabel( "Search conversation titles" ), "order", 90 );
			await at( 0.45 );
			await p.getByLabel( "Search conversation titles" ).fill( "" );
			await sleep( 500 );
			await click( p.getByRole( "button", { name: /researcher/ } ).or( p.locator( "button.chip, .chip" ).filter( { hasText: /researcher/ } ) ) );
			await sleep( 600 );
			await at( 0.65 );
			await click( p.getByRole( "button", { name: /Any agent/ } ).or( p.locator( ".chip" ).filter( { hasText: /Any agent/ } ) ) );
			await sleep( 500 );
			const boxes = p.locator( "tbody input[type=checkbox]" );
			await click( boxes.nth( 1 ) ); await sleep( 200 ); await click( boxes.nth( 2 ) ); await sleep( 200 ); await click( boxes.nth( 3 ) );
			await shot( "conversations-bulk" );
		},
		async routines() {
			await go( "#/routines" );
			await at( 0.35 );
			await click( p.getByRole( "button", { name: /Reports of/ } ).first() );
			await sleep( 900 );
			await shot( "routine-reports" );
			await click( p.locator( "#routineReportList button, #routineReportList a" ).first() ).catch( () => {} );
			await sleep( 700 );
			await shot( "routine-report-text" );
			await at( 0.66 );
			await p.keyboard.press( "Escape" ); await sleep( 400 );
			await p.selectOption( "#rtOwner", { index: 1 } ).catch( () => {} );
			await glide( p.locator( "#rtOwner" ) );
			await shot( "routines" );
		},
		async registry() {
			await go( "#/registry" );
			await at( 0.30 );
			await scroll( 520 );
			await at( 0.52 );
			await go( "#/registry/skills" );
			await sleep( 400 );
			await click( p.getByRole( "button", { name: /Read the skill refund-policy/ } ) );
			await sleep( 1000 );
			await shot( "skill-reader" );
			await at( 0.82 );
			await click( p.getByRole( "button", { name: "Close" } ).first() ).catch( () => {} );
			await go( "#/registry/volumes" );
		},
		async memory() {
			await go( "#/memory" );
			await at( 0.18 );
			await shot( "memory-you" );
			await typeInto( p.getByPlaceholder( "Add a note" ).first(), "Likes a short answer first", 45 );
			await p.keyboard.press( "Enter" );
			await at( 0.45 );
			await scroll( 460 );
			await shot( "memory-agent" );
			await at( 0.72 );
			await scroll( 520 );
			await shot( "memory-conversations" );
		},
		async vault() {
			await go( "#/vault" );
			await at( 0.35 );
			await glide( p.getByText( "CARRIER_API_KEY" ).first() );
			await at( 0.60 );
			await click( p.getByRole( "link", { name: /agent's/i } ).or( p.getByText( "The agent's" ) ) );
			await sleep( 700 );
			await shot( "vault-agent" );
			await at( 0.85 );
			await scroll( 300, 5 );
		},
		async agent() {
			await go( "#/agent" );
			await at( 0.30 );
			await scroll( 520 );
			await at( 0.52 );
			await go( "#/agent/files" );
			await sleep( 500 );
			await click( p.getByRole( "button", { name: /Read/ } ).first() );
			await sleep( 900 );
			await shot( "agent-files" );
			await at( 0.80 );
			await go( "#/agent/usage" );
			await shot( "agent-usage" );
		},
		async gateways() {
			await go( "#/gateways" );
			await at( 0.45 );
			await click( p.getByRole( "button", { name: "Reconnect telegram" } ).or( p.getByRole( "button", { name: /Reconnect/ } ).nth( 1 ) ) );
			await sleep( 900 );
			await shot( "gateways" );
		},
		async logs() {
			await go( "#/logs" );
			await at( 0.30 );
			await p.waitForSelector( 'a[href^="#/logs/"]' ).catch( () => {} );
			await click( p.locator( 'a[href^="#/logs/"]' ).filter( { hasText: "Routines" } ) );
			await sleep( 700 );
			await typeInto( p.locator( 'input[placeholder*="earch" i]' ).first(), "build-check", 70 );
			await at( 0.75 );
			await click( p.locator( "#logsAuto, input[type=checkbox]" ).first() ).catch( () => {} );
			await shot( "logs" );
		},
		async access() {
			await go( "#/access" );
			await at( 0.28 );
			await typeInto( p.getByPlaceholder( "Name" ).first(), "trailer-bot", 60 );
			await click( p.getByRole( "button", { name: /Make a token/ } ) );
			await sleep( 900 );
			await shot( "token-once" );
			await at( 0.65 );
			await go( "#/access/people" );
			await sleep( 400 );
			await glide( p.getByRole( "button", { name: /Make an admin/ } ).first() );
			await shot( "people" );
		},
		async data() {
			await go( "#/data" );
			await at( 0.45 );
			await click( p.getByRole( "button", { name: "Make a backup" } ) );
			await sleep( 1500 );
			await shot( "data" );
			await scroll( 300, 5 );
		},
		async settings() {
			await go( "#/settings" );
			await at( 0.30 );
			await click( p.locator( "#pageView .seg[aria-label='Mode'] button[data-value=dark]" ) );
			await sleep( 900 );
			await shot( "dark" );
			await at( 0.58 );
			await click( p.locator( "#pageView .swatches button[data-accent]:not([data-accent=''])" ).nth( 6 ) ).catch( () => {} );
			await at( 0.80 );
			await click( p.locator( "#pageView .seg[aria-label='Text size'] button[data-value=large]" ) ).catch( () => {} );
			await sleep( 700 );
			await click( p.locator( "#pageView .seg[aria-label='Text size'] button[data-value=medium]" ) ).catch( () => {} );
			await click( p.locator( "#pageView .default-sw" ) ).catch( () => {} );
		},
		async phone() {
			await p.goto( base + "/__trailer/phone" );
			await sleep( 1200 );
			await shot( "phone" );
			await at( 0.45 );
			const frame = p.frameLocator( "#f" );
			const f = p.frames().find( x => x !== p.mainFrame() );
			const box = await p.locator( "#f" ).boundingBox();
			off = { x: box.x, y: box.y };
			await f.locator( "#navBtn" ).click().catch( () => {} );
			await sleep( 900 );
			await shot( "phone-drawer" );
			await at( 0.80 );
			await f.locator( "#navScrim" ).click( { position: { x: 360, y: 400 } } ).catch( () => {} );
			off = { x: 0, y: 0 };
		},
		async terminal() {
			await p.goto( base + "/__trailer/terminal" );
			await sleep( 600 );
			await shot( "terminal" );
		},
		async outro() {
			await p.goto( base + "/__trailer/end" );
			await sleep( 600 );
			await shot( "end" );
		}
	};

	for ( const s of scenes ) {
		sceneStart = Date.now();
		budget = s.seconds * 1000 + LEAD;
		await p.evaluate( c => { try { sessionStorage.setItem( "__trailerCaption", c ); } catch ( e ) {} }, s.caption ).catch( () => {} );
		const startMs = sceneStart - t0;
		try { await actions[ s.id ](); } catch ( e ) { console.warn( s.id + ": " + e.message.split( "\n" )[ 0 ] ); }
		const need = budget + TAIL;
		const spent = Date.now() - sceneStart;
		if ( spent < need ) { await sleep( need - spent ); }
		else { console.warn( s.id + ": actions ran " + ( spent - need ) + " ms longer than the narration" ); }
		timeline.push( { id: s.id, startMs, endMs: Date.now() - t0, seconds: s.seconds } );
	}
	fs.writeFileSync( out + "/timeline.json", JSON.stringify( timeline, null, 2 ) );
	const endWall = t0 + timeline[ timeline.length - 1 ].endMs;
	await cdp.send( "Page.stopScreencast" ).catch( () => {} );
	await ctx.close();
	await browser.close();
	// frames to a picture: every frame is held until the next one; time zero is t0
	const list = [];
	let start = 0;
	while ( start + 1 < frames.length && frames[ start + 1 ].ts <= t0 ) { start++; }
	for ( let i = start; i < frames.length; i++ ) {
		const from = Math.max( frames[ i ].ts, t0 );
		const to = i + 1 < frames.length ? Math.min( frames[ i + 1 ].ts, endWall ) : endWall;
		if ( to > from ) { list.push( "file '" + out + "/frames/" + frames[ i ].file + "'\nduration " + ( ( to - from ) / 1000 ).toFixed( 3 ) ); }
	}
	list.push( "file '" + out + "/frames/" + frames[ frames.length - 1 ].file + "'" );
	fs.writeFileSync( out + "/frames.txt", list.join( "\n" ) + "\n" );
	require( "child_process" ).execFileSync( "ffmpeg", [ "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", out + "/frames.txt", "-vf", "fps=25,format=yuv420p", "-c:v", "libx264", "-crf", "26", "-preset", "medium", "-an", out + "/picture.mp4" ] );
	console.log( "frames " + frames.length );
	console.log( JSON.stringify( timeline.map( t => t.id + " " + t.startMs ) ) );
} )();
