/**
 * The last of the chat in the new web app (UI 10): a real extension (the dev agent's panel: its slots and its Ping
 * button), talking to a sub-agent with the model picker (the dev agent has no sub-agent, so the tree is routed), the
 * warning before leaving while a turn runs, and the password of an agent without accounts (routed: the dev agent has
 * accounts).
 *
 * @param {import("playwright").Page} page The page
 * @param {Function} shot Saves a screenshot
 */
export default async function tour( page, shot ) {
	const pause = ms => page.waitForTimeout( ms );
	await page.route( "**/__bxagents/agent", async route => {
		const res = await route.fetch();
		const body = await res.json();
		body.agents = [ { name: "ui-dev", parent: "" }, { name: "researcher", parent: "ui-dev", description: "Reads and sums up" } ];
		await route.fulfill( { response: res, json: body } );
	} );
	await page.route( "**/__bxagents/sessions", route => route.request().method() === "POST"
		? route.fulfill( { json: { success: true, conversationId: "researcher-" + Date.now() } } )
		: route.fallback() );

	await page.goto( "next/" );
	await page.waitForLoadState( "networkidle" );
	await page.click( "#newBtn" );
	await page.waitForLoadState( "networkidle" );
	await page.locator( "#slotComposer .panel-button" ).click();
	await pause( 1200 );
	await shot( "extension-slots-and-ping" );

	await page.getByRole( "combobox", { name: "Talk to" } ).selectOption( "researcher" );
	await pause( 600 );
	await page.getByRole( "combobox", { name: "Model" } ).selectOption( "planner" );
	await pause( 700 );
	await shot( "talking-to-a-sub-agent-with-a-model" );
	await page.evaluate( () => localStorage.removeItem( "bxagents_webui_profile" ) );

	await page.unroute( "**/__bxagents/sessions" );
	await page.unroute( "**/__bxagents/agent" );
	await page.route( "**/__bxagents/stream", async route => {
		await new Promise( done => setTimeout( done, 5000 ) );
		return route.fulfill( { contentType: "text/event-stream", body: "data: [DONE]\n\n" } ).catch( () => {} );
	} );
	await page.goto( "next/" );
	await page.waitForLoadState( "networkidle" );
	await page.locator( "#input" ).pressSequentially( "Take your time", { delay: 40 } );
	await page.keyboard.press( "Enter" );
	await pause( 400 );
	await page.locator( "a.nav-item[data-page='settings']" ).click();
	await pause( 700 );
	await shot( "asks-before-leaving-mid-answer" );
	await page.locator( "#confirmDialog" ).getByRole( "button", { name: "Cancel" } ).click();
	await page.unroute( "**/__bxagents/stream" );

	await page.route( "**/chat/next/settings", async route => {
		const res = await route.fetch();
		await route.fulfill( { response: res, body: ( await res.text() ).replace( "\"signIn\":true", "\"signIn\":false" ) } );
	} );
	await page.route( "**/__bxagents/**", route => route.request().headers()[ "x-bxagents-token" ] === "s3cret"
		? route.fallback()
		: route.fulfill( { status: 401, json: { error: "Unauthorized" } } ) );
	await page.goto( "next/settings" );
	await page.locator( "#keyPanel" ).waitFor();
	await page.locator( "#keyInput" ).pressSequentially( "s3cret", { delay: 60 } );
	await pause( 500 );
	await shot( "password-asked-by-a-refusal" );
	await page.locator( "#keyPanel" ).getByRole( "button", { name: "Save" } ).click();
	await page.locator( ".facts" ).waitFor();
	await pause( 900 );
	await shot( "password-kept-and-sent" );
	await page.evaluate( () => localStorage.removeItem( "bxagents_webui_api_key" ) );
}
