/**
 * The chat in the new web app: a turn streamed with $sse, Markdown that cannot run, a tool call, the conversation list,
 * and the same open conversation as the current page.
 */
import { test, expect, freshChat, ask } from "./support.js";

test( "streams an answer, draws Markdown and code, and lists the conversation", async( { page, errors } ) => {
	await freshChat( page, "./" );
	await expect( page.locator( ".welcome .suggestions button" ) ).toHaveCount( 2 );
	await ask( page, "Show me a list", "Three things" );
	const answer = page.locator( ".bubble.assistant" ).last();
	await expect( answer.locator( "ol li" ) ).toHaveCount( 3 );
	await expect( answer.locator( ".codeblock .lang" ) ).toHaveText( "js" );
	await expect( answer.locator( ".codeblock code .hljs-built_in, .codeblock code span" ).first() ).toBeVisible();
	await expect( page.getByRole( "button", { name: "Copy answer" } ) ).toBeVisible();
	await expect( page.locator( "#convList li.active" ) ).toBeVisible();
	// your message is one line high: the bubble keeps white space, so the markup inside it must have none
	const bubble = await page.locator( ".bubble.user" ).last().boundingBox();
	expect( bubble.height ).toBeLessThan( 60 );
	expect( errors ).toEqual( [] );
} );

test( "never runs or loads markup the model sends", async( { page } ) => {
	await freshChat( page, "./" );
	await ask( page, "xss please", "and **bold**".replace( /\*/g, "" ) );
	const answer = page.locator( ".bubble.assistant" ).last();
	await expect( answer.locator( "img" ) ).toHaveCount( 0 );
	await expect( answer.locator( "script" ) ).toHaveCount( 0 );
	await expect( answer ).toContainText( "<img src=x" );
	expect( await page.evaluate( () => window.__xss ) ).toBeUndefined();
} );

test( "shows a tool call with its arguments, done when the turn ends", async( { page } ) => {
	await freshChat( page, "./" );
	await ask( page, "What time is it?", "It is" );
	const tool = page.locator( "details.trace.tool" ).last();
	await expect( tool.locator( "summary" ) ).toContainText( "now" );
	await expect( tool.locator( ".status" ) ).toHaveText( "done" );
} );

test( "a suggestion sends itself, and a reload reopens the same conversation", async( { page } ) => {
	await freshChat( page, "./" );
	await page.locator( ".welcome .suggestions button", { hasText: "Show me a list" } ).click();
	await expect( page.locator( "#messages" ) ).toContainText( "Three things", { timeout: 30_000 } );
	await expect( page.locator( "#stopBtn" ) ).toBeHidden( { timeout: 30_000 } );
	await page.reload();
	await expect( page.locator( "#messages" ) ).toContainText( "Three things" );
	await expect( page.locator( ".bubble.user" ).first() ).toHaveText( "Show me a list" );
} );

test( "renames and deletes a conversation from the list", async( { page } ) => {
	await freshChat( page, "./" );
	await ask( page, "Show me a list", "Three things" );
	const row = page.locator( "#convList li.active" );
	await row.getByRole( "button", { name: /^Rename / } ).click();
	await page.locator( "#confirmInput" ).fill( "Renamed in e2e" );
	await page.locator( "#confirmInput" ).press( "Enter" );
	await expect( page.locator( "#convList li.active .name" ) ).toHaveText( "Renamed in e2e" );
	await page.locator( "#convList li.active" ).getByRole( "button", { name: "Delete Renamed in e2e" } ).click();
	await page.locator( "#confirmDialog" ).getByRole( "button", { name: "Delete" } ).click();
	await expect( page.locator( "#convList .name", { hasText: "Renamed in e2e" } ) ).toHaveCount( 0 );
} );

test( "opens the same conversation as the current page", async( { page } ) => {
	await freshChat( page, "./" );
	await ask( page, "Show me a list", "Three things" );
	await page.goto( "./" );
	await expect( page.locator( "#messages" ) ).toContainText( "Three things" );
} );
