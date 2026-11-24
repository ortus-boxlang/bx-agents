/**
 * Makes every screenshot of the web app in the docs (docs/assets/webui/*.png and docs/assets/webui-chat-*.png) from the
 * trailer's demo agent, seeded (trailer/seed.js), so every page looks lived in. Signs in as the admin (ada).
 *
 *   NODE_PATH=$(npm root -g) node screens.js --url=http://127.0.0.1:8791 --out=../../../docs/assets [--only=name,name]
 *
 * Desktop shots are 1366 x 800 (1280 is a little narrow for the chat toolbar when the agent has sub-agents) and phone shots
 * 390 x 844, both at twice the pixels. Every conversation a shot starts is deleted after it, so the sidebar is the same in
 * every shot. --mask=<path> shows <path> as /var/lib/acme-support/data in the pages (the Data page prints the data home). Dark shots follow a dark system
 * theme, so nothing is saved as the person's choice.
 */
const { chromium } = require( "playwright" );
const fs = require( "fs" );
const path = require( "path" );
const args = Object.fromEntries( process.argv.slice( 2 ).map( a => a.replace( /^--/, "" ).split( "=" ) ) );
const base = ( args.url || "http://127.0.0.1:8791" ).replace( /\/$/, "" );
const app = base + "/chat";
const out = args.out || "out";
const mask = args.mask || "";
const only = args.only ? args.only.split( "," ) : null;
fs.mkdirSync( path.join( out, "webui" ), { recursive: true } );
const sleep = ms => new Promise( r => setTimeout( r, ms ) );

( async () => {
	const browser = await chromium.launch();
	// one sign-in, kept for every context
	const signIn = await browser.newPage();
	await signIn.goto( app + "/login" );
	await signIn.fill( "input[name=username]", "ada" );
	await signIn.fill( "input[name=password]", "demo-pass" );
	await Promise.all( [ signIn.waitForNavigation(), signIn.click( "button[type=submit]" ) ] );
	const state = await signIn.context().storageState();
	const api = ( route, body ) => signIn.evaluate( async ( [ route, body ] ) => {
		const r = await fetch( "/__bxagents" + route, body === undefined ? {} : { method : "POST", headers : { "content-type" : "application/json", "x-bxagents-csrf" : "1" }, body : JSON.stringify( body ) } );
		return r.json().catch( () => ( {} ) );
	}, [ route, body ] );
	const listIds = async() => ( ( await api( "/sessions?limit=200" ) ).sessions || [] ).map( c => c.id );
	// an empty conversation (a New chat nobody wrote in) is clutter in the sidebar
	for ( const c of ( await api( "/sessions?limit=200" ) ).sessions || [] ) {
		if ( !c.messageCount ) {
			await api( "/sessions/delete", { conversationId : c.id } );
		}
	}
	const baseline = new Set( await listIds() );
	// the conversations a shot starts are removed after it
	const cleanUp = async() => {
		for ( const id of await listIds() ) {
			if ( !baseline.has( id ) ) {
				await api( "/sessions/delete", { conversationId : id } );
			}
		}
	};

	/**
	 * @param {object} opts { dark, phone, signedOut }
	 * @returns {Promise<import("playwright").Page>} A page in a fresh context
	 */
	const open = async ( opts = {} ) => {
		const ctx = await browser.newContext( {
			viewport          : opts.phone ? { width: 390, height: 844 } : { width: 1366, height: 800 },
			deviceScaleFactor : 2,
			colorScheme       : opts.dark ? "dark" : "light",
			storageState      : opts.signedOut ? undefined : state,
			isMobile          : !!opts.phone,
			hasTouch          : !!opts.phone
		} );
		// the shots follow the system theme, whatever was chosen in an earlier run
		await ctx.addInitScript( () => {
			try {
				localStorage.removeItem( "bxagents_webui_theme" );
			} catch ( e ) {
				// no storage
			}
		} );
		if ( opts.phone ) {
			// The conversation list is a fixed overlay on a phone and the new app has no button to close it, so it
			// would cover the chat. The phone shots hide it, to show the chat and the menu drawer.
			await ctx.addInitScript( () => document.addEventListener( "DOMContentLoaded", () => {
				const style = document.createElement( "style" );
				style.textContent = "#sidebar { display: none !important; }";
				document.head.appendChild( style );
			} ) );
		}
		return ctx.newPage();
	};
	const settle = async p => {
		await p.waitForLoadState( "networkidle" ).catch( () => {} );
		await sleep( 700 );
	};
	const goto = async ( p, where ) => {
		await p.goto( app + where );
		await settle( p );
	};
	const save = async( p, name ) => {
		if ( mask ) {
			await p.evaluate( ( [ from, to ] ) => {
				const walk = document.createTreeWalker( document.body, NodeFilter.SHOW_TEXT );
				for ( let n = walk.nextNode(); n; n = walk.nextNode() ) {
					n.nodeValue = n.nodeValue.split( from ).join( to );
				}
			}, [ mask, "/var/lib/acme-support/data" ] );
		}
		await p.screenshot( { path: path.join( out, name + ".png" ) } );
	};
	const idle = p => p.waitForFunction( () => !document.querySelector( "#stopBtn:not([hidden])" ), null, { timeout: 30000 } ).catch( () => {} );
	const fresh = async p => {
		await goto( p, "/" );
		await p.locator( "#newBtn" ).evaluate( b => b.click() );
		await settle( p );

	};
	const ask = async ( p, text ) => {
		await p.fill( "#input", text );
		await p.click( "#sendBtn" );
		await sleep( 500 );
		await idle( p );
		await sleep( 600 );
	};

	// the demo agent lists a mail service in Agent.yml that needs a sign in (tools/demo/fake-oauth-mcp.bxs): connect it as
	// a person would, through the sign in page it opens
	const connectMail = async p => {
		await goto( p, "/connectors/agent" );
		const button = p.getByRole( "button", { name: /^Connect mail/ } );
		if ( !await button.count() ) {
			return;
		}
		const popup = p.context().waitForEvent( "page" );
		await button.click();
		const sign = await popup;
		await sign.getByRole( "link", { name: "Allow" } ).click();
		await sleep( 1500 );
		await sign.close().catch( () => {} );
		await goto( p, "/connectors/agent" );
	};

	const shots = {
		async "webui/login"() {
			const p = await open( { signedOut: true } );
			await goto( p, "/login" );
			await save( p, "webui/login" );
		},
		async "webui/empty-suggestions"() {
			const p = await open();
			await fresh( p );
			await save( p, "webui/empty-suggestions" );
		},
		async "webui/webui-chat"() {
			const p = await open();
			await fresh( p );
			await ask( p, "Where is my order?" );
			await ask( p, "Are you open right now?" );
			await save( p, "webui/webui-chat" );
			await save( p, "webui-chat-light" );
		},
		async "webui/markdown-list"() {
			const p = await open();
			await fresh( p );
			await ask( p, "What is your return policy?" );
			await save( p, "webui/markdown-list" );
		},
		async "webui/code-block"() {
			const p = await open();
			await fresh( p );
			await ask( p, "Write a function that adds tax to a price" );
			await save( p, "webui/code-block" );
		},
		async "webui/tool-call"() {
			const p = await open();
			await fresh( p );
			await ask( p, "Are you open right now?" );
			await p.locator( "details.trace.tool summary" ).last().click().catch( () => {} );
			await sleep( 500 );
			await save( p, "webui/tool-call" );
		},
		async "webui/model-picker"() {
			const p = await open();
			await fresh( p );
			await ask( p, "How long does shipping take?" );
			// a native select's list is drawn by the system, not the page: show the picker focused, with its choice
			const pick = p.locator( "select[aria-label=Model]" );
			await pick.selectOption( { index: 1 } ).catch( () => {} );
			await pick.focus();
			await sleep( 400 );
			await save( p, "webui/model-picker" );
			await pick.selectOption( { index: 0 } ).catch( () => {} );
		},
		async "webui/commands-menu"() {
			const p = await open();
			await fresh( p );
			await p.locator( "#input" ).pressSequentially( "/", { delay: 50 } );
			await p.waitForSelector( "#slashMenu li" ).catch( () => {} );
			await sleep( 400 );
			await save( p, "webui/commands-menu" );
		},
		async "webui/context-panel"() {
			const p = await open();
			await fresh( p );
			await ask( p, "Where is my order?" );
			await ask( p, "What is your return policy?" );
			await p.locator( ".chat-bar .ctx-ring" ).click();
			await p.getByRole( "dialog", { name: "Context" } ).waitFor().catch( () => {} );
			await sleep( 600 );
			await save( p, "webui/context-panel" );
		},
		async "webui/webui-talk-to"() {
			const p = await open();
			await fresh( p );
			await p.getByRole( "combobox", { name: "Talk to" } ).selectOption( "researcher" );
			await sleep( 600 );
			await ask( p, "Find sources for our shipping times" );
			await save( p, "webui/webui-talk-to" );
		},
		async "webui/dark-theme"() {
			const p = await open( { dark: true } );
			await fresh( p );
			await ask( p, "Where is my order?" );
			await ask( p, "Are you open right now?" );
			await save( p, "webui/dark-theme" );
			await save( p, "webui/webui-chat-dark" );
			await save( p, "webui-chat-dark" );
		},
		async "webui/webui-chat-mobile"() {
			const p = await open( { phone: true } );
			await fresh( p );
			await ask( p, "Where is my order?" );
			await save( p, "webui/webui-chat-mobile" );
			await save( p, "webui-chat-mobile" );
		},
		async "webui/webui-drawer-mobile"() {
			const p = await open( { phone: true } );
			await goto( p, "/" );
			// a tap, as on a phone (the drawer's button sits under the page's own touch layer for a pointer click)
			await p.locator( "#navBtn" ).evaluate( b => b.click() );
			await sleep( 700 );
			// the drawer's open state is set (aria-expanded) but the module's styles do not slide it in yet: show it in
			// place, as the design has it (see the notes in the README)
			await p.addStyleTag( { content: "#mainNav { transform: none !important; visibility: visible !important; z-index: 50; }" } );
			await sleep( 400 );
			await save( p, "webui/webui-drawer-mobile" );
		},
		async "webui/webui-menu-folded"() {
			const p = await open();
			await goto( p, "/conversations" );
			await p.click( "#navFold" );
			await sleep( 600 );
			await save( p, "webui/webui-menu-folded" );
			// the fold is kept in this browser only; this context is thrown away
		},
		async "webui/webui-conversations"() {
			const p = await open();
			await goto( p, "/conversations" );
			await save( p, "webui/webui-conversations" );
		},
		async "webui/webui-routines"() {
			const p = await open();
			await goto( p, "/routines" );
			await save( p, "webui/webui-routines" );
		},
		async "webui/webui-routine-reports"() {
			const p = await open();
			await goto( p, "/routines" );
			await p.getByRole( "button", { name: /^Reports of routine / } ).first().click();
			await sleep( 900 );
			await p.getByRole( "button", { name: /^View / } ).first().click().catch( () => {} );
			await sleep( 700 );
			await save( p, "webui/webui-routine-reports" );
		},
		async "webui/webui-registry"() {
			const p = await open();
			await goto( p, "/registry" );
			await save( p, "webui/webui-registry" );
		},
		async "webui/webui-registry-skills"() {
			const p = await open();
			await goto( p, "/registry/skills" );
			// taller than the others: the skill's text opens under the list of six shipped skills
			await p.setViewportSize( { width: 1366, height: 1300 } );
			await sleep( 400 );
			await p.getByRole( "button", { name: "Read the skill refund-policy" } ).click().catch( () => {} );
			await sleep( 900 );
			await save( p, "webui/webui-registry-skills" );
		},
		async "webui/webui-memory"() {
			const p = await open();
			await goto( p, "/memory" );
			await save( p, "webui/webui-memory" );
		},
		async "webui/webui-vault"() {
			const p = await open();
			await goto( p, "/vault" );
			await save( p, "webui/webui-vault" );
		},
		async "webui/webui-agent"() {
			const p = await open();
			await goto( p, "/agent" );
			await save( p, "webui/webui-agent" );
		},
		async "webui/webui-agent-dark"() {
			const p = await open( { dark: true } );
			await goto( p, "/agent" );
			await save( p, "webui/webui-agent-dark" );
		},
		async "webui/webui-agent-files"() {
			const p = await open();
			await goto( p, "/agent/files" );
			await p.getByRole( "button", { name: "Read Agent.yml" } ).click().catch( () => {} );
			await sleep( 800 );
			await save( p, "webui/webui-agent-files" );
		},
		async "webui/webui-agent-usage"() {
			const p = await open();
			await goto( p, "/agent/usage" );
			await save( p, "webui/webui-agent-usage" );
		},
		async "webui/webui-gateways"() {
			const p = await open();
			await goto( p, "/gateways" );
			await save( p, "webui/webui-gateways" );
		},
		async "webui/webui-logs"() {
			const p = await open();
			await goto( p, "/logs/routines" );
			await save( p, "webui/webui-logs" );
		},
		async "webui/webui-access"() {
			const p = await open();
			await goto( p, "/access/tokens" );
			await save( p, "webui/webui-access" );
		},
		async "webui/webui-access-people"() {
			const p = await open();
			await goto( p, "/access/people" );
			await save( p, "webui/webui-access-people" );
		},
		async "webui/webui-data"() {
			const p = await open();
			await goto( p, "/data" );
			await save( p, "webui/webui-data" );
		},
		async "webui/webui-settings"() {
			const p = await open();
			await goto( p, "/settings" );
			await save( p, "webui/webui-settings" );
			await save( p, "webui/settings-menu" );
		},
		async "webui/appearance"() {
			const p = await open();
			await goto( p, "/settings" );
			await p.getByRole( "group", { name: "Mode" } ).scrollIntoViewIfNeeded().catch( () => {} );
			await sleep( 400 );
			await save( p, "webui/appearance" );
		},
		async "webui/webui-settings-dark"() {
			const p = await open( { dark: true } );
			await goto( p, "/settings" );
			await save( p, "webui/webui-settings-dark" );
		},
		async "webui/connectors"() {
			const p = await open();
			await connectMail( p );
			await goto( p, "/connectors" );
			await save( p, "webui/connectors" );
		},
		async "webui/connections"() {
			// the services written in Agent.yml, with the mail service connected
			const p = await open();
			await connectMail( p );
			await sleep( 800 );
			await save( p, "webui/connections" );
		},
		async "webui/webui-logs-live"() {
			const p = await open();
			await goto( p, "/logs/routines" );
			await p.locator( "label.switch-row", { hasText: "Live" } ).click();
			await sleep( 1500 );
			await save( p, "webui/webui-logs-live" );
		}
	};

	for ( const [ name, make ] of Object.entries( shots ) ) {
		if ( only && !only.includes( name ) ) {
			continue;
		}
		try {
			await make();
			await cleanUp();
			console.log( "made " + name );
		} catch ( e ) {
			console.warn( name + ": " + e.message.split( "\n" )[ 0 ] );
		}
	}
	await browser.close();
} )();
