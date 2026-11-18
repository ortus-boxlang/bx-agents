/**
 * The contract extensions rely on: window.bxagents and the slots. Frozen here before the UI moves to Alpine, so the move
 * cannot break an extension without a test failing.
 */
import { test, expect } from "./support.js";

test( "window.bxagents keeps its shape", async ( { page } ) => {
	await page.goto( "./" );
	await expect( page.locator( "#input" ) ).toBeVisible();
	const shape = await page.evaluate( () => {
		const api = window.bxagents;
		return Object.fromEntries( Object.keys( api ).sort().map( k => [ k, typeof api[ k ] ] ) );
	} );
	expect( shape ).toEqual( {
		apiBase       : "string",
		conversationId: "function",
		icon          : "function",
		onRefresh     : "function",
		refresh       : "function",
		runCommand    : "function",
		slot          : "function"
	} );
} );

test( "a slot can be filled in the header, the sidebar and the composer, and an unknown place is refused", async ( { page } ) => {
	await page.goto( "./" );
	await expect( page.locator( "#input" ) ).toBeVisible();
	const result = await page.evaluate( () => {
		const made = [ "header", "sidebar", "composer" ].map( place => {
			const box = window.bxagents.slot( place );
			box.textContent = "ext-" + place;
			return box.isConnected;
		} );
		let refused = false;
		try {
			window.bxagents.slot( "nowhere" );
		} catch ( e ) {
			refused = /no place/i.test( e.message );
		}
		return { made, refused };
	} );
	expect( result ).toEqual( { made: [ true, true, true ], refused: true } );
	await expect( page.getByText( "ext-header" ) ).toBeVisible();
} );
