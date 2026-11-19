/**
 * The chat of the new web app (UI 8): an empty chat with its suggestions, a streamed answer with Markdown and code, a
 * tool call, the conversation list, a rename, and the dark theme.
 *
 * @param {import("playwright").Page} page The page
 * @param {Function} shot Saves a screenshot
 */
export default async function tour( page, shot ) {
	const pause = ms => page.waitForTimeout( ms );
	await page.goto( "./" );
	await page.waitForLoadState( "networkidle" );
	await page.click( "#newBtn" );
	await page.waitForLoadState( "networkidle" );
	await pause( 600 );
	await shot( "empty-chat-with-suggestions" );

	await page.locator( ".welcome .suggestions button", { hasText: "Show me a list" } ).click();
	await page.locator( "#stopBtn" ).waitFor( { state: "hidden", timeout: 30_000 } );
	await pause( 800 );
	await shot( "streamed-markdown-and-code" );

	await page.locator( "#input" ).pressSequentially( "What time is it?", { delay: 40 } );
	await page.keyboard.press( "Enter" );
	await page.locator( "#stopBtn" ).waitFor( { state: "hidden", timeout: 30_000 } );
	await page.locator( "details.trace.tool" ).last().locator( "summary" ).click();
	await pause( 800 );
	await shot( "tool-call-opened" );

	await page.locator( "#convList li.active" ).getByRole( "button", { name: /^Rename / } ).click();
	await page.locator( "#confirmInput" ).fill( "" );
	await page.locator( "#confirmInput" ).pressSequentially( "Lists and the time", { delay: 40 } );
	await pause( 500 );
	await shot( "rename-with-the-prompt-dialog" );
	await page.locator( "#confirmInput" ).press( "Enter" );
	await pause( 800 );

	await page.click( "#themeToggle" );
	await pause( 800 );
	await shot( "dark-theme" );
	await page.click( "#themeToggle" );
	await pause( 600 );
}
