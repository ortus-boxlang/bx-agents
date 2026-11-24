/**
 * A conversation with a sub-agent keeps going to that sub-agent when it is not among the 25 rows the chat lists: opened
 * from the Conversations page (which stores the id and loads the chat), or on a reload. The owner comes from the
 * conversation itself (GET /history), never from the list page.
 */
import { test, expect } from "./support.js";

const API = "/__bxagents";
const HEADERS = { "x-bxagents-source": "web", "x-bxagents-csrf": "1" };

/**
 * Starts a conversation over the API and gives its id.
 *
 * @param {import("@playwright/test").Page} page A signed in page
 * @param {object} body The POST /sessions body
 * @returns {Promise<string>} The conversation id
 */
async function start( page, body ) {
	const made = await page.request.post( API + "/sessions", { headers: HEADERS, data: body } );
	expect( made.ok() ).toBe( true );
	return ( await made.json() ).conversationId;
}

test( "a sub-agent conversation past the first page of the list still goes to its sub-agent", async( { page, errors } ) => {
	test.setTimeout( 120_000 );
	const older = await start( page, { agent: "helper", title: "helper " + Date.now() } );
	// 30 newer conversations push it out of the 25 rows the chat lists
	for ( let i = 0; i < 30; i++ ) {
		await start( page, {} );
	}
	const listed = await ( await page.request.get( API + "/sessions?limit=25", { headers: HEADERS } ) ).json();
	expect( listed.sessions.map( s => s.id ) ).not.toContain( older );

	// what the Conversations page's "open in chat" does: keep the id, load the chat
	await page.goto( "./" );
	await page.evaluate( id => localStorage.setItem( "bxagents_webui_conversation", id ), older );
	await page.goto( "./" );
	await expect( page.locator( "#input" ) ).toBeVisible();
	await page.waitForLoadState( "networkidle" );

	for ( const step of [
		"first",
		"reload"
	] ) {
		if ( step === "reload" ) {
			await page.reload();
			await expect( page.locator( "#input" ) ).toBeVisible();
			await page.waitForLoadState( "networkidle" );
		}
		const sent = page.waitForRequest( r => /\/(stream|invoke)$/.test( r.url() ) && r.method() === "POST" );
		await page.fill( "#input", "hello again, " + step + " round" );
		await page.keyboard.press( "Enter" );
		expect( ( await sent ).postDataJSON().agent ).toBe( "helper" );
		await expect( page.locator( ".bubble.assistant" ).last() ).toContainText( "scripted answer" );
		await expect( page.locator( "#stopBtn" ) ).toBeHidden( { timeout: 30_000 } );
		await expect( page.locator( "#messages" ) ).not.toContainText( "belongs to" );
	}
	expect( errors ).toEqual( [] );
} );
