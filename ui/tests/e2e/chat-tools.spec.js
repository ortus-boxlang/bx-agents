/**
 * The chat's tools in the new web app: slash commands and their replies, files that go with a message, an approval
 * answered with /resume, the context gauge, Compact, Fork, Export, and a vault request that opens the Vault page.
 */
import { test, expect, freshChat, ask } from "./support.js";

/**
 * @param {Array<object|string>} frames The frames to send: objects as JSON, "[DONE]" as is
 * @returns {string} A text/event-stream body
 */
function sse( frames ) {
	return frames.map( f => "event: chunk\ndata: " + ( typeof f === "string" ? f : JSON.stringify( f ) ) + "\n\n" ).join( "" );
}
const say = text => ( { choices: [ { delta: { content: text } } ] } );

test( "the / menu lists the commands, Tab completes one, and a reply is drawn as text", async( { page, errors } ) => {
	await freshChat( page, "./" );
	await page.locator( "#input" ).pressSequentially( "/he" );
	await expect( page.locator( "#slashMenu li" ).first() ).toContainText( "/help" );
	await page.keyboard.press( "Tab" );
	await expect( page.locator( "#input" ) ).toHaveValue( "/help " );
	await page.keyboard.press( "Enter" );
	const reply = page.locator( ".bubble.command" ).last();
	await expect( reply.locator( "p", { hasText: "/new" } ).first() ).toBeVisible();
	await expect( page.locator( "#slashMenu" ) ).toBeHidden();
	expect( errors ).toEqual( [] );
} );

test( "a text file goes inside the message, and its chip can be removed", async( { page } ) => {
	await freshChat( page, "./" );
	const files = page.locator( "#composer input[type=file]" );
	await files.setInputFiles( [
		{ name: "notes.md", mimeType: "text/markdown", buffer: Buffer.from( "# Notes\nKeep it short." ) },
		{ name: "drop.txt", mimeType: "text/plain", buffer: Buffer.from( "remove me" ) }
	] );
	await expect( page.locator( "#attachChips .chip-file" ) ).toHaveCount( 2 );
	await page.getByRole( "button", { name: "Remove drop.txt" } ).click();
	await expect( page.locator( "#attachChips .chip-file" ) ).toHaveCount( 1 );
	const sent = page.waitForRequest( r => r.url().endsWith( "/__bxagents/stream" ) );
	await ask( page, "Show me a list", "Three things" );
	const body = ( await sent ).postDataJSON();
	expect( body.input ).toContain( "Attached, the contents of the file `notes.md`" );
	expect( body.input ).toContain( "Keep it short." );
	expect( body.input ).not.toContain( "remove me" );
	await expect( page.locator( ".bubble.user" ).last() ).toHaveText( "Show me a list" );
	await expect( page.locator( "#attachChips" ) ).toBeHidden();
} );

test( "refuses a file that is neither a picture nor text", async( { page } ) => {
	await freshChat( page, "./" );
	await page.locator( "#composer input[type=file]" ).setInputFiles( { name: "tool.exe", mimeType: "application/octet-stream", buffer: Buffer.from( "MZ" ) } );
	await expect( page.locator( ".hint" ) ).toHaveText( "tool.exe is not a picture or a text file." );
} );

test( "a paused tool call asks for approval, and Approve streams the rest of the turn", async( { page } ) => {
	await page.route( "**/__bxagents/stream", route => route.fulfill( {
		contentType : "text/event-stream",
		body        : sse( [
			say( "Let me delete it." ),
			{ type: "middleware_stop" },
			"[DONE]"
		] )
	} ) );
	await page.route( "**/__bxagents/pending?*", route => route.fulfill( { json: { pending: true, pendingActions: [ { name: "delete_file", arguments: { path: "/tmp/x" } } ] } } ) );
	let resumed = null;
	await page.route( "**/__bxagents/resume", route => {
		resumed = route.request().postDataJSON();
		return route.fulfill( {
			contentType : "text/event-stream",
			body        : sse( [
				say( "Deleted /tmp/x." ),
				"[DONE]"
			] )
		} );
	} );
	await freshChat( page, "./" );
	await page.fill( "#input", "delete it" );
	await page.click( "#sendBtn" );
	const card = page.getByRole( "group", { name: "Approval" } );
	await expect( card ).toContainText( "Approve this action?" );
	await expect( card ).toContainText( "delete_file {\"path\":\"/tmp/x\"}" );
	// the card is scrolled into view, not left under the composer
	await expect( card.getByRole( "button", { name: "Approve" } ) ).toBeInViewport();
	const composer = await page.locator( "#composer" ).boundingBox();
	const button = await card.getByRole( "button", { name: "Approve" } ).boundingBox();
	expect( button.y + button.height ).toBeLessThanOrEqual( composer.y );
	await card.getByRole( "button", { name: "Approve" } ).click();
	await expect( page.locator( ".bubble.assistant" ).last() ).toContainText( "Deleted /tmp/x." );
	await expect( card ).toHaveCount( 0 );
	expect( resumed.decision ).toBe( "approve" );
	expect( resumed.threadId ).toBeTruthy();
} );

test( "a vault request opens the Vault page with the ask", async( { page } ) => {
	await page.route( "**/__bxagents/stream", route => route.fulfill( {
		contentType : "text/event-stream",
		body        : sse( [
			{ choices: [ { delta: { "tool_calls": [ { index: 0, function: { name: "vault_request", arguments: "{\"name\":\"GITHUB_TOKEN\",\"why\":\"To read your issues\"}" } } ] } } ] },
			say( "I need a token." ),
			"[DONE]"
		] )
	} ) );
	await freshChat( page, "./" );
	await page.fill( "#input", "read my issues" );
	await page.click( "#sendBtn" );
	await expect( page ).toHaveURL( /\/chat\/vault\?ask=GITHUB_TOKEN&scope=user&why=To\+read\+your\+issues/ );
	await expect( page.getByText( "The agent asked for GITHUB_TOKEN." ) ).toBeVisible();
} );

test( "the context gauge opens the breakdown, and Compact says what it did", async( { page } ) => {
	await freshChat( page, "./" );
	await ask( page, "Show me a list", "Three things" );
	const ring = page.locator( ".chat-bar .ctx-ring" );
	await expect( ring ).toBeVisible();
	await ring.click();
	const drawer = page.getByRole( "dialog", { name: "Context" } );
	await expect( drawer.getByRole( "list", { name: "What is sent to the model" } ).locator( "li" ).first() ).toBeVisible();
	await drawer.getByRole( "button", { name: "Compact this conversation" } ).click();
	await expect( page.locator( ".hint" ) ).toContainText( /Nothing to compact yet|Compacted/ );
} );

test( "Fork copies the conversation through the prompt dialog, and Export saves a file", async( { page } ) => {
	await freshChat( page, "./" );
	await ask( page, "Show me a list", "Three things" );
	const before = await page.evaluate( () => localStorage.getItem( "bxagents_webui_conversation" ) );
	await page.getByRole( "button", { name: "Fork", exact: true } ).click();
	// typed key by key, as a person does: the first key must not be lost to the text box selecting itself
	await page.locator( "#confirmInput" ).pressSequentially( "Forked in e2e" );
	await page.locator( "#confirmInput" ).press( "Enter" );
	await expect( page.locator( "#convList li.active .name" ) ).toHaveText( "Forked in e2e" );
	expect( await page.evaluate( () => localStorage.getItem( "bxagents_webui_conversation" ) ) ).not.toBe( before );
	await expect( page.locator( "#messages" ) ).toContainText( "Three things" );

	const download = page.waitForEvent( "download" );
	await page.getByRole( "button", { name: "Export", exact: true } ).click();
	expect( ( await download ).suggestedFilename() ).toMatch( /\.md$/ );
} );
