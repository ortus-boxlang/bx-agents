/**
 * The chat's tools in the new web app (UI 9): the "/" menu and a command's reply, a file that goes with a message, an
 * approval answered with /resume (the dev agent has no tool that pauses, so that stream is routed), the context
 * breakdown, and Fork through the prompt dialog.
 *
 * @param {import("playwright").Page} page The page
 * @param {Function} shot Saves a screenshot
 */
export default async function tour( page, shot ) {
	const pause = ms => page.waitForTimeout( ms );
	const sse = frames => frames.map( f => "event: chunk\ndata: " + ( typeof f === "string" ? f : JSON.stringify( f ) ) + "\n\n" ).join( "" );
	const say = text => ( { choices: [ { delta: { content: text } } ] } );
	const idle = () => page.locator( "#stopBtn" ).waitFor( { state: "hidden", timeout: 30_000 } );

	await page.goto( "next/" );
	await page.waitForLoadState( "networkidle" );
	await page.click( "#newBtn" );
	await page.waitForLoadState( "networkidle" );

	await page.locator( "#input" ).pressSequentially( "/", { delay: 60 } );
	await pause( 700 );
	await shot( "commands-menu" );
	await page.locator( "#input" ).pressSequentially( "he", { delay: 80 } );
	await page.keyboard.press( "Tab" );
	await page.keyboard.press( "Enter" );
	await pause( 900 );
	await shot( "help-reply" );

	await page.locator( "#composer input[type=file]" ).setInputFiles( { name: "release-notes.md", mimeType: "text/markdown", buffer: Buffer.from( "# 1.0\n- Connectors\n- New web app" ) } );
	await page.locator( "#input" ).pressSequentially( "Show me a list", { delay: 40 } );
	await pause( 600 );
	await shot( "file-attached" );
	await page.keyboard.press( "Enter" );
	await idle();
	await pause( 600 );

	await page.route( "**/__bxagents/stream", route => route.fulfill( { contentType: "text/event-stream", body: sse( [ say( "I will clean the old reports." ), { type: "middleware_stop" }, "[DONE]" ] ) } ) );
	await page.route( "**/__bxagents/pending?*", route => route.fulfill( { json: { pending: true, pendingActions: [ { name: "delete_reports", arguments: { olderThanDays: 30 } } ] } } ) );
	await page.route( "**/__bxagents/resume", route => route.fulfill( { contentType: "text/event-stream", body: sse( [ say( "Done: **12 reports** older than 30 days are gone." ), "[DONE]" ] ) } ) );
	await page.locator( "#input" ).pressSequentially( "Clean the old reports", { delay: 40 } );
	await page.keyboard.press( "Enter" );
	await page.getByRole( "group", { name: "Approval" } ).waitFor();
	await pause( 700 );
	await shot( "approval-asked" );
	await page.getByRole( "button", { name: "Approve" } ).click();
	await idle();
	await pause( 700 );
	await shot( "approved-and-resumed" );
	await page.unroute( "**/__bxagents/stream" );

	await page.locator( ".chat-bar .ctx-ring" ).click();
	await pause( 900 );
	await shot( "context-breakdown" );
	await page.keyboard.press( "Escape" );
	await pause( 400 );

	await page.getByRole( "button", { name: "Fork", exact: true } ).click();
	await page.locator( "#confirmInput" ).pressSequentially( "Another approach", { delay: 40 } );
	await pause( 500 );
	await shot( "fork-prompt" );
	await page.locator( "#confirmInput" ).press( "Enter" );
	await pause( 1200 );
	await shot( "forked" );
}
