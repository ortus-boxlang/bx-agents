/**
 * The web app with the keyboard alone: the skip link, a visible focus ring on every Tab stop, and dialogs that hold the
 * focus while open and hand it back to the button that opened them.
 */
import { test, expect } from "./support.js";

const APP = "/chat";

test( "the first Tab stop is Skip to content, and it moves the focus to the page", async( { page } ) => {
	await page.goto( APP + "/settings" );
	await page.waitForLoadState( "networkidle" );
	await page.keyboard.press( "Tab" );
	const skip = page.getByRole( "link", { name: "Skip to content" } );
	await expect( skip ).toBeFocused();
	await expect( skip ).toBeVisible();
	await page.keyboard.press( "Enter" );
	await expect( page.locator( "#content" ) ).toBeFocused();
} );

for ( const id of [
	"",
	"settings",
	"connectors",
	"logs"
] ) {
	test( "every Tab stop shows where the focus is: " + ( id || "chat" ), async( { page } ) => {
		await page.goto( APP + "/" + id );
		await page.waitForLoadState( "networkidle" );
		const unseen = [];
		for ( let i = 0; i < 40; i++ ) {
			await page.keyboard.press( "Tab" );
			const stop = await page.evaluate( () => {
				const el = document.activeElement;
				if ( !el || el === document.body ) {
					return null;
				}
				// the ring may be on the element or, for a styled checkbox, on what follows it
				const shown = node => {
					if ( !node ) {
						return false;
					}
					const style = getComputedStyle( node );
					return ( style.outlineStyle !== "none" && parseFloat( style.outlineWidth ) > 0 ) || style.boxShadow !== "none";
				};
				const ring = shown( el ) || shown( el.nextElementSibling ) || shown( el.closest( ":focus-within" ) !== el ? null : el.parentElement );
				return { ring, name: el.tagName.toLowerCase() + ( el.id ? "#" + el.id : "" ) + " " + ( el.getAttribute( "aria-label" ) || el.textContent || "" ).trim().slice( 0, 40 ) };
			} );
			if ( stop && !stop.ring ) {
				unseen.push( stop.name );
			}
		}
		expect( unseen ).toEqual( [] );
	} );
}

test( "a dialog takes the focus, keeps Tab inside, and Escape hands it back to the button that opened it", async( { page } ) => {
	await page.goto( APP + "/routines" );
	await page.waitForLoadState( "networkidle" );
	const opener = page.getByRole( "button", { name: "New routine" } );
	await opener.focus();
	await page.keyboard.press( "Enter" );
	const dialog = page.getByRole( "dialog" ).filter( { has: page.locator( ":focus" ) } );
	await expect( dialog ).toHaveCount( 1 );
	for ( let i = 0; i < 25; i++ ) {
		await page.keyboard.press( "Tab" );
		// past the last control the focus goes to the browser's own bar (the body here) and comes back: never to the page
		expect( await page.evaluate( () => document.activeElement === document.body || !!document.activeElement.closest( "dialog[open]" ) ) ).toBe( true );
	}
	await page.keyboard.press( "Escape" );
	await expect( page.locator( "dialog[open]" ) ).toHaveCount( 0 );
	await expect( opener ).toBeFocused();
} );

test( "the question dialog hands the focus back too", async( { page } ) => {
	await page.goto( APP + "/data" );
	await page.waitForLoadState( "networkidle" );
	const restore = page.getByRole( "button", { name: /^Restore / } ).first();
	await restore.focus();
	await page.keyboard.press( "Enter" );
	await expect( page.locator( "#confirmDialog" ) ).toBeVisible();
	expect( await page.evaluate( () => !!document.activeElement.closest( "#confirmDialog" ) ) ).toBe( true );
	await page.keyboard.press( "Escape" );
	await expect( page.locator( "#confirmDialog" ) ).toBeHidden();
	await expect( restore ).toBeFocused();
} );

test( "asks for less motion: nothing animates or slides", async( { page } ) => {
	await page.emulateMedia( { reducedMotion: "reduce" } );
	await page.goto( APP + "/" );
	const nav = await page.locator( "#mainNav" ).evaluate( el => getComputedStyle( el ).transitionDuration );
	expect( parseFloat( nav ) ).toBeLessThan( 0.001 );
} );
