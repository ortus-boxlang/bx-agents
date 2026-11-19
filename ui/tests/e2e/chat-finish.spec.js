/**
 * The rest of the chat in the new web app: the extension contract and a real extension (the dev agent's panel), the
 * agent and model pickers, the password of an agent without accounts, and the warning before leaving while a turn runs.
 */
import { test, expect, freshChat, ask } from "./support.js";

test( "window.bxagents keeps the current page's shape, and a slot can go in each place", async ( { page, errors } ) => {
	await page.goto( "./" );
	await expect( page.locator( "#input" ) ).toBeVisible();
	const shape = await page.evaluate( () => Object.fromEntries( Object.keys( window.bxagents ).sort().map( k => [ k, typeof window.bxagents[ k ] ] ) ) );
	expect( shape ).toEqual( {
		apiBase       : "string",
		conversationId: "function",
		icon          : "function",
		onRefresh     : "function",
		refresh       : "function",
		runCommand    : "function",
		slot          : "function"
	} );
	const result = await page.evaluate( () => {
		const made = [ "header", "sidebar", "composer" ].map( place => {
			const box = window.bxagents.slot( place );
			box.textContent = "ext-" + place;
			return box.isConnected;
		} );
		let refused = false;
		try {
			window.bxagents.slot( "nowhere" );
		} catch ( e ) {
			refused = /no place/i.test( e.message );
		}
		return { made, refused, id: window.bxagents.conversationId() };
	} );
	expect( result.made ).toEqual( [ true, true, true ] );
	expect( result.refused ).toBe( true );
	expect( result.id ).toBeTruthy();
	await expect( page.getByText( "ext-header" ) ).toBeVisible();
	expect( errors ).toEqual( [] );
} );

test( "the dev agent's panel extension: its script adds Ping, its command runs, its slots are drawn", async ( { page } ) => {
	await freshChat( page, "./" );
	await expect( page.locator( "#slotSidebar .slot-server strong" ) ).toHaveText( "panel" );
	const ping = page.locator( "#slotComposer .panel-button" );
	await expect( ping ).toBeVisible();
	await ping.click();
	await expect( page.locator( ".bubble.command" ).last() ).toContainText( /pong \d+/ );
	await expect( page.locator( "#slotHeader .slot-server" ) ).toContainText( /panel: \d+ ping/ );
} );

test( "talks to a sub-agent from the picker, with a banner, and sends the chosen model", async ( { page } ) => {
	await page.route( "**/__bxagents/agent", async route => {
		const res = await route.fetch();
		const body = await res.json();
		body.agents = [ { name: "ui-dev", parent: "" }, { name: "helper", parent: "ui-dev", description: "Helps" } ];
		await route.fulfill( { response: res, json: body } );
	} );
	let started = null;
	// the real server has no sub-agent named helper: the new conversation is routed too, so the page keeps talking to it
	await page.route( "**/__bxagents/sessions", route => {
		if ( route.request().method() === "POST" ) {
			started = route.request().postDataJSON();
			return route.fulfill( { json: { success: true, conversationId: "helper-" + Date.now() } } );
		}
		return route.fallback();
	} );
	await freshChat( page, "./" );
	await page.getByRole( "combobox", { name: "Talk to" } ).selectOption( "helper" );
	await expect.poll( () => started ).toEqual( { agent: "helper" } );
	await expect( page.locator( ".talk-banner" ) ).toContainText( "You are talking to helper directly (a sub-agent of ui-dev)" );
	await page.getByRole( "combobox", { name: "Model" } ).selectOption( "planner" );
	expect( await page.evaluate( () => localStorage.getItem( "bxagents_webui_profile" ) ) ).toBe( "planner" );
	const sent = page.waitForRequest( r => r.url().endsWith( "/__bxagents/stream" ) );
	await page.fill( "#input", "Show me a list" );
	await page.click( "#sendBtn" );
	const body = ( await sent ).postDataJSON();
	expect( body.agent ).toBe( "helper" );
	expect( body.options.profile ).toBe( "planner" );
	await page.evaluate( () => localStorage.removeItem( "bxagents_webui_profile" ) );
} );

test( "asks for the password when the server refuses, keeps it and sends it", async ( { browser } ) => {
	// a server without accounts that refuses a missing token: the agent API answers 401 until the token is sent
	const context = await browser.newContext( { storageState: "tests/../.stack/auth/ada.json" } );
	const page = await context.newPage();
	// the dev agent has accounts: this page plays an agent without them
	await page.route( "**/chat/settings", async route => {
		const res = await route.fetch();
		const html = ( await res.text() ).replace( "\"signIn\":true", "\"signIn\":false" );
		await route.fulfill( { response: res, body: html } );
	} );
	await page.route( "**/__bxagents/**", async route => {
		if ( route.request().headers()[ "x-bxagents-token" ] !== "s3cret" ) {
			return route.fulfill( { status: 401, json: { error: "Unauthorized" } } );
		}
		return route.fallback();
	} );
	await page.goto( "settings" );
	const dialog = page.locator( "#keyPanel" );
	await expect( dialog ).toBeVisible();
	await expect( dialog ).toContainText( "The server refused the password" );
	await dialog.getByLabel( "Password" ).fill( "s3cret" );
	await dialog.getByRole( "button", { name: "Save" } ).click();
	await expect( page.locator( ".facts" ) ).toContainText( "ui-dev" );
	expect( await page.evaluate( () => localStorage.getItem( "bxagents_webui_api_key" ) ) ).toBe( "s3cret" );
	await context.close();
} );

test( "asks before leaving while the agent answers, and stays on Cancel", async ( { page } ) => {
	await page.route( "**/__bxagents/stream", async route => {
		// an answer that takes its time
		await new Promise( done => setTimeout( done, 4000 ) );
		return route.fulfill( { contentType: "text/event-stream", body: "data: [DONE]\n\n" } ).catch( () => {} );
	} );
	await freshChat( page, "./" );
	await page.fill( "#input", "take your time" );
	await page.click( "#sendBtn" );
	await expect( page.locator( "#stopBtn" ) ).toBeVisible();
	await page.locator( "a.nav-item[data-page='settings']" ).click();
	await expect( page.locator( "#confirmTitle" ) ).toHaveText( "Leave while the agent answers?" );
	await page.locator( "#confirmDialog" ).getByRole( "button", { name: "Cancel" } ).click();
	await expect( page ).toHaveURL( /\/chat\/$/ );
	await page.locator( "a.nav-item[data-page='settings']" ).click();
	await page.locator( "#confirmDialog" ).getByRole( "button", { name: "Leave" } ).click();
	await expect( page ).toHaveURL( /\/chat\/settings$/ );
} );

test( "an agent with accounts has no Password button", async ( { page } ) => {
	await page.goto( "./" );
	await expect( page.locator( "#keyBtn" ) ).toHaveCount( 0 );
	await ask( page, "Show me a list", "Three things" );
} );
