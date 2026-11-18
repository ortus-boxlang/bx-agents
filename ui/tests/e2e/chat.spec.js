/**
 * The chat: a streamed answer, Markdown, a tool call, and text from the model that must never run as code.
 */
import { test, expect, ask, freshChat } from "./support.js";

test( "streams an answer from the model", async ( { page, errors } ) => {
	await freshChat( page );
	await ask( page, "hello there", "This is the scripted answer from fast-model" );
	expect( errors ).toEqual( [] );
} );

test( "draws Markdown: a list and a code block", async ( { page } ) => {
	await freshChat( page );
	await ask( page, "give me a list", "Three things" );
	await expect( page.locator( "#messages ol li" ).first() ).toHaveText( "One" );
	await expect( page.locator( "#messages pre code" ).first() ).toContainText( "console.log" );
} );

test( "never runs markup the model sends", async ( { page } ) => {
	await freshChat( page );
	await ask( page, "xss please", "Here is markup" );
	expect( await page.evaluate( () => window.__xss ) ).toBeUndefined();
	await expect( page.locator( "#messages script" ) ).toHaveCount( 0 );
	await expect( page.locator( "#messages img[onerror]" ) ).toHaveCount( 0 );
} );

test( "calls a tool and answers with its result", async ( { page } ) => {
	await freshChat( page );
	await ask( page, "what time is it", "It is" );
} );

test( "keeps a message sent right after New chat", async ( { page } ) => {
	await page.goto( "./" );
	await expect( page.locator( "#input" ) ).toBeVisible();
	await page.waitForLoadState( "networkidle" );
	// no wait between the two: the list of conversations is still loading when the message goes
	await page.click( "#newBtn" );
	await page.fill( "#input", "sent at once" );
	await page.click( "#sendBtn" );
	await expect( page.locator( "#messages" ) ).toContainText( "sent at once" );
	await expect( page.locator( "#messages" ) ).toContainText( "This is the scripted answer", { timeout: 30_000 } );
} );
