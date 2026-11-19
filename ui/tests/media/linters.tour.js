/**
 * The linters (UI 12): the places the Sass changed for Stylelint look as before. The menu folded to icons (its labels
 * hidden with clip-path), a tool call (the running pulse is now tool-pulse), and the Logs page (long lines wrap).
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
	await page.locator( "#input" ).pressSequentially( "What time is it?", { delay: 40 } );
	await page.keyboard.press( "Enter" );
	await page.locator( "#stopBtn" ).waitFor( { state: "hidden", timeout: 30_000 } );
	await pause( 800 );
	await shot( "chat-with-a-tool-call" );

	await page.click( "#navFold" );
	await pause( 800 );
	await shot( "menu-folded-to-icons" );
	await page.click( "#navFold" );
	await pause( 600 );

	await Promise.all( [
		page.waitForURL( /\/chat\/logs/ ),
		page.click( ".nav-item[data-page=\"logs\"]" )
	] );
	await page.waitForLoadState( "networkidle" );
	await pause( 800 );
	await shot( "logs-page" );
}
