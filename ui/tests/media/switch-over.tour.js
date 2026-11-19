/**
 * The switch over (UI 11): the web app answers at /chat itself. Sign out to the sign-in form the module serves, sign in
 * again to the chat, ask a question, then walk a few pages of the menu, each at its own address.
 *
 * @param {import("playwright").Page} page The page
 * @param {Function} shot Saves a screenshot
 */
export default async function tour( page, shot ) {
	const pause = ms => page.waitForTimeout( ms );
	await page.goto( "./" );
	await page.waitForLoadState( "networkidle" );
	await pause( 600 );
	await shot( "chat-at-chat" );

	await Promise.all( [ page.waitForURL( /login\.html/ ), page.click( "#signOut" ) ] );
	await pause( 600 );
	await shot( "sign-in-form-at-chat-login" );
	await page.locator( "input[name=username]" ).pressSequentially( "ada", { delay: 60 } );
	await page.locator( "input[name=password]" ).pressSequentially( "demo-pass", { delay: 60 } );
	await Promise.all( [ page.waitForURL( /\/chat\/$/ ), page.keyboard.press( "Enter" ) ] );
	await page.waitForLoadState( "networkidle" );
	await page.click( "#newBtn" );
	await page.waitForLoadState( "networkidle" );
	await page.locator( "#input" ).pressSequentially( "What time is it?", { delay: 40 } );
	await page.keyboard.press( "Enter" );
	await page.locator( "#stopBtn" ).waitFor( { state: "hidden", timeout: 30_000 } );
	await pause( 800 );
	await shot( "signed-in-again-and-answered" );

	for ( const id of [ "connectors", "routines", "settings" ] ) {
		await Promise.all( [ page.waitForURL( new RegExp( "/chat/" + id ) ), page.click( `.nav-item[data-page="${ id }"]` ) ] );
		await page.waitForLoadState( "networkidle" );
		await pause( 700 );
		await shot( id + "-page" );
	}
	await Promise.all( [ page.waitForURL( /\/chat\/$/ ), page.click( '.nav-item[data-page="chat"]' ) ] );
	await pause( 600 );
}
