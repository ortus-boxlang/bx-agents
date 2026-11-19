/**
 * Makes every screenshot of the web app in the docs (docs/assets/webui/*.png and docs/assets/webui-chat-*.png) from the
 * trailer's demo agent, seeded (trailer/seed.js), so every page looks lived in. Signs in as the admin (ada).
 *
 *   NODE_PATH=$(npm root -g) node screens.js --url=http://127.0.0.1:8791 --out=../../../docs/assets [--only=name,name]
 *
 * Desktop shots are 1280 x 800 and phone shots 390 x 844, both at twice the pixels. Dark shots follow a dark system
 * theme, so nothing is saved as the person's choice.
 */
const { chromium } = require( "playwright" );
const fs = require( "fs" );
const path = require( "path" );
const args = Object.fromEntries( process.argv.slice( 2 ).map( a => a.replace( /^--/, "" ).split( "=" ) ) );
const base = ( args.url || "http://127.0.0.1:8791" ).replace( /\/$/, "" );
const app = base + "/chat";
const out = args.out || "out";
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
	await signIn.close();

	/**
	 * @param {object} opts { dark, phone, signedOut }
	 * @returns {Promise<import("playwright").Page>} A page in a fresh context
	 */
	const open = async ( opts = {} ) => {
		const ctx = await browser.newContext( {
			viewport          : opts.phone ? { width: 390, height: 844 } : { width: 1280, height: 800 },
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
	const save = ( p, name ) => p.screenshot( { path: path.join( out, name + ".png" ) } );
	const idle = p => p.waitForFunction( () => !document.querySelector( "#stopBtn:not([hidden])" ), null, { timeout: 30000 } ).catch( () => {} );
	const fresh = async p => {
		await goto( p, "/" );
		await p.click( "#newBtn" );
		await settle( p );
	};
	const ask = async ( p, text ) => {
		await p.fill( "#input", text );
		await p.click( "#sendBtn" );
		await sleep( 500 );
		await idle( p );
		await sleep( 600 );
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
			await p.getByRole( "button", { name: "Read Agent.yaml" } ).click().catch( () => {} );
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
			await goto( p, "/connectors" );
			await save( p, "webui/connectors" );
		},
		async "webui/connections"() {
			const p = await open();
			await goto( p, "/connectors/agent" );
			await save( p, "webui/connections" );
		}
	};

	for ( const [ name, make ] of Object.entries( shots ) ) {
		if ( only && !only.includes( name ) ) {
			continue;
		}
		try {
			await make();
			console.log( "made " + name );
		} catch ( e ) {
			console.warn( name + ": " + e.message.split( "\n" )[ 0 ] );
		}
	}
	await browser.close();
} )();
