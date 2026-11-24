/**
 * The phone layout (390 px): the menu and the list of conversations are drawers. Both start shut, open from a button in
 * the page, and shut again on a pick, a tap on the scrim, or Escape, with the focus kept inside while open and handed
 * back after. On a wide screen they are plain columns.
 */
import { test, expect } from "./support.js";
import AxeBuilder from "@axe-core/playwright";

const APP = "/chat";

/**
 * @param {import("@playwright/test").Page} page The page
 * @param {string} path The page under /chat, "" for the chat
 * @param {number} [width] The viewport width
 */
async function open( page, path, width = 390 ) {
	await page.setViewportSize( { width, height: 800 } );
	await page.goto( APP + "/" + path );
	await page.waitForLoadState( "networkidle" );
}

/**
 * @param {import("@playwright/test").Page} page The page
 * @param {string} selector The element
 * @returns {Promise<number>} The right edge of the element on the screen
 */
async function rightEdge( page, selector ) {
	return page.locator( selector ).evaluate( el => el.getBoundingClientRect().right );
}

test( "the chat at 390 px starts with the conversations shut and the Menu button within reach", async( { page } ) => {
	await open( page, "" );
	await expect( page.locator( "body" ) ).toHaveAttribute( "data-drawer", "" );
	await expect( page.locator( "#sidebar" ) ).toBeHidden();
	await expect( page.locator( "#sidebar" ) ).toHaveJSProperty( "inert", true );
	expect( await rightEdge( page, "#sidebar" ) ).toBeLessThanOrEqual( 0 );
	await expect( page.locator( "#navScrim" ) ).toBeHidden();
	await expect( page.locator( "#sidebarBtn" ) ).toBeVisible();
	await expect( page.locator( "#sidebarBtn" ) ).toHaveAttribute( "aria-expanded", "false" );
	await expect( page.locator( "#sidebarBtn" ) ).toHaveAttribute( "aria-controls", "sidebar" );
	// the first control of the header answers a click, and nothing sits on the composer
	await expect( page.locator( "#mainNav" ) ).toHaveJSProperty( "inert", true );
	await page.click( "#navBtn", { timeout: 3000 } );
	await expect( page.locator( "#mainNav" ) ).toBeVisible();
	await page.keyboard.press( "Escape" );
	await expect( page.locator( "#mainNav" ) ).toBeHidden();
	await page.click( "#input", { timeout: 3000 } );
} );

test( "the conversations open from their button and shut on a pick, the scrim and Escape", async( { page } ) => {
	await open( page, "" );
	const button = page.locator( "#sidebarBtn" );
	await button.click();
	await expect( page.locator( "body" ) ).toHaveAttribute( "data-drawer", "conversations" );
	await expect( page.locator( "#sidebar" ) ).toBeVisible();
	await expect( page.locator( "#sidebar" ) ).toHaveJSProperty( "inert", false );
	await expect( button ).toHaveAttribute( "aria-expanded", "true" );
	await expect( page.locator( "#navScrim" ) ).toBeVisible();
	await expect( page.locator( "#mainNav" ) ).toBeHidden();
	await expect.poll( () => rightEdge( page, "#sidebar" ) ).toBeGreaterThan( 200 );
	// the focus is inside, and Tab does not leave
	await expect.poll( () => page.evaluate( () => !!document.activeElement.closest( "#sidebar" ) ) ).toBe( true );
	for ( let i = 0; i < 12; i++ ) {
		await page.keyboard.press( "Tab" );
		expect( await page.evaluate( () => !!document.activeElement.closest( "#sidebar" ) ) ).toBe( true );
	}
	// a tap on the scrim, beside the drawer
	await page.mouse.click( 375, 400 );
	await expect( page.locator( "#sidebar" ) ).toBeHidden();
	await expect( button ).toHaveAttribute( "aria-expanded", "false" );
	await expect( button ).toBeFocused();
	// Escape
	await button.click();
	await expect( page.locator( "#sidebar" ) ).toBeVisible();
	await page.keyboard.press( "Escape" );
	await expect( page.locator( "#sidebar" ) ).toBeHidden();
	await expect( button ).toBeFocused();
	// a pick: New chat starts a conversation and shuts the drawer
	await button.click();
	await page.click( "#newBtn" );
	await expect( page.locator( "#sidebar" ) ).toBeHidden();
	await expect( page.locator( "body" ) ).toHaveAttribute( "data-drawer", "" );
	await expect( page.locator( "#messages" ) ).toContainText( "Hi! This agent answers from a script" );
} );

test( "the Menu opens the menu over the chat, and only one drawer is open at a time", async( { page } ) => {
	await open( page, "" );
	await page.click( "#navBtn" );
	await expect( page.locator( "body" ) ).toHaveAttribute( "data-drawer", "nav" );
	await expect( page.locator( "#navBtn" ) ).toHaveAttribute( "aria-expanded", "true" );
	await expect( page.locator( "#sidebar" ) ).toBeHidden();
	await expect( page.locator( "#mainNav a.nav-item[data-page='chat']" ) ).toBeFocused();
	await page.mouse.click( 375, 400 );
	await expect( page.locator( "#mainNav" ) ).toBeHidden();
	await expect( page.locator( "#navBtn" ) ).toBeFocused();
} );

test( "on another page the Menu opens and shuts the menu, and a pick goes to its page", async( { page } ) => {
	await open( page, "settings" );
	const menu = page.locator( "#mainNav" );
	const button = page.locator( "#navBtn" );
	await expect( menu ).toBeHidden();
	await expect( menu ).toHaveJSProperty( "inert", true );
	await expect( page.locator( "#sidebarBtn" ) ).toHaveCount( 0 );
	await button.click();
	await expect( page.locator( "body" ) ).toHaveAttribute( "data-drawer", "nav" );
	await expect( menu ).toBeVisible();
	await expect( menu ).toHaveJSProperty( "inert", false );
	await expect( button ).toHaveAttribute( "aria-expanded", "true" );
	await expect( page.locator( "#navScrim" ) ).toBeVisible();
	await expect.poll( () => rightEdge( page, "#mainNav" ) ).toBeGreaterThan( 200 );
	await expect.poll( () => page.evaluate( () => !!document.activeElement.closest( "#mainNav" ) ) ).toBe( true );
	// the scrim, then Escape
	await page.mouse.click( 375, 400 );
	await expect( menu ).toBeHidden();
	await expect( button ).toHaveAttribute( "aria-expanded", "false" );
	await expect( button ).toBeFocused();
	await button.click();
	await expect( menu ).toBeVisible();
	await page.keyboard.press( "Escape" );
	await expect( menu ).toBeHidden();
	await expect( button ).toBeFocused();
	// the page behind is not covered while it is shut
	await expect( page.locator( "#navScrim" ) ).toBeHidden();
	await page.click( "#content h1", { timeout: 3000 } );
	// a pick
	await button.click();
	await page.click( "#mainNav a.nav-item[data-page='routines']" );
	await expect( page ).toHaveURL( /\/routines$/ );
	await expect( page.locator( "#mainNav" ) ).toBeHidden();
	await expect( page.locator( "body" ) ).toHaveAttribute( "data-drawer", "" );
} );

test( "a drawer left open is shut when the screen grows, and a wide screen has both columns", async( { page } ) => {
	await open( page, "" );
	await page.click( "#sidebarBtn" );
	await expect( page.locator( "#sidebar" ) ).toBeVisible();
	await page.setViewportSize( { width: 1280, height: 800 } );
	await expect( page.locator( "body" ) ).toHaveAttribute( "data-drawer", "" );
	await expect( page.locator( "#sidebar" ) ).toBeVisible();
	await expect( page.locator( "#sidebar" ) ).toHaveJSProperty( "inert", false );
	await expect( page.locator( "#mainNav" ) ).toBeVisible();
	await expect( page.locator( "#mainNav" ) ).toHaveJSProperty( "inert", false );
	await expect( page.locator( "#navBtn" ) ).toBeHidden();
	await expect( page.locator( "#sidebarBtn" ) ).toBeHidden();
	await expect( page.locator( "#navScrim" ) ).toBeHidden();
	expect( await page.locator( "#sidebar" ).evaluate( el => getComputedStyle( el ).position ) ).toBe( "static" );
} );

for ( const theme of [
	"light",
	"dark"
] ) {
	test( "the open drawers pass axe at 390 px, " + theme, async( { page } ) => {
		await page.addInitScript( mode => localStorage.setItem( "bxagents_webui_theme", mode ), theme );
		await open( page, "" );
		for ( const button of [
			"#sidebarBtn",
			"#navBtn"
		] ) {
			await page.click( button );
			await page.waitForTimeout( 300 );
			const found = ( await new AxeBuilder( { page } ).withTags( [
				"wcag2a",
				"wcag2aa",
				"wcag21aa",
				"wcag22aa"
			] ).analyze() ).violations.filter( v => [
				"serious",
				"critical"
			].includes( v.impact ) );
			expect( found.map( v => v.id + ": " + v.nodes.map( n => n.target.join( " " ) ).join( ", " ) ) ).toEqual( [] );
			await page.keyboard.press( "Escape" );
			await expect( page.locator( "body" ) ).toHaveAttribute( "data-drawer", "" );
		}
	} );
}
