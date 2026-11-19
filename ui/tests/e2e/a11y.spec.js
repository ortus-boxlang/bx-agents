/**
 * Accessibility: axe-core checks every page of the web app (as an admin and as a member, light and dark, desktop and
 * phone width), the sign-in form, and the dialogs and drawers while they are open. A serious or critical finding fails
 * the test; the others are written to the report so they can be fixed too.
 */
import { test, expect, freshChat, ask } from "./support.js";
import AxeBuilder from "@axe-core/playwright";

const APP = "/chat";
const PAGES = [
	"",
	"conversations",
	"routines",
	"registry",
	"connectors",
	"memory",
	"vault",
	"settings",
	"agent",
	"gateways",
	"logs",
	"access",
	"data"
];
const MEMBER_PAGES = [
	"",
	"conversations",
	"routines",
	"registry",
	"connectors",
	"memory",
	"vault",
	"settings"
];
const TAGS = [
	"wcag2a",
	"wcag2aa",
	"wcag21a",
	"wcag21aa",
	"wcag22aa",
	"best-practice"
];

/**
 * Checks the page as it is now.
 *
 * @param {import("@playwright/test").Page} page The page
 * @param {string} where What is checked, for the message
 * @param {import("@playwright/test").TestInfo} info The test, to attach every finding to its report
 */
async function check( page, where, info ) {
	const result = await new AxeBuilder( { page } ).withTags( TAGS ).analyze();
	if ( result.violations.length ) {
		await info.attach( where, { body: JSON.stringify( result.violations, null, 1 ), contentType: "application/json" } );
	}
	const blocking = result.violations
		.filter( v => v.impact === "serious" || v.impact === "critical" )
		.map( v => v.impact + " " + v.id + ": " + v.help + " (" + v.nodes.map( n => n.target.join( " " ) ).join( ", " ) + ")" );
	expect( blocking, where ).toEqual( [] );
}

/**
 * Opens a page and waits for what it loads.
 *
 * @param {import("@playwright/test").Page} page The page
 * @param {string} id The page, "" for the chat
 */
async function open( page, id ) {
	await page.goto( APP + "/" + id );
	await page.waitForLoadState( "networkidle" );
}

for ( const theme of [
	"light",
	"dark"
] ) {
	for ( const width of [
		1280,
		390
	] ) {
		test( "every page, " + theme + " at " + width + " px", async( { page }, info ) => {
			test.setTimeout( 180_000 );
			await page.setViewportSize( { width, height: 800 } );
			await page.addInitScript( mode => localStorage.setItem( "bxagents_webui_theme", mode ), theme );
			for ( const id of PAGES ) {
				await open( page, id );
				await check( page, ( id || "chat" ) + " " + theme + " " + width, info );
			}
		} );
	}
}

test( "every page a member sees", async( { member }, info ) => {
	test.setTimeout( 120_000 );
	for ( const id of MEMBER_PAGES ) {
		await open( member, id );
		await check( member, "member " + ( id || "chat" ), info );
	}
} );

test( "the sign-in form", async( { browser }, info ) => {
	const context = await browser.newContext( { storageState: { cookies: [], origins: [] } } );
	const page = await context.newPage();
	await page.goto( APP + "/login.html" );
	await check( page, "sign in", info );
	await context.close();
} );

test( "the dialogs and drawers, open", async( { page }, info ) => {
	test.setTimeout( 120_000 );
	await open( page, "routines" );
	await page.getByRole( "button", { name: "New routine" } ).click();
	await expect( page.getByRole( "dialog" ).first() ).toBeVisible();
	await check( page, "routine editor", info );

	await open( page, "connectors" );
	await page.getByRole( "button", { name: "Connect GitHub" } ).click();
	await expect( page.getByRole( "dialog", { name: "Connect GitHub" } ) ).toBeVisible();
	await check( page, "connect dialog", info );

	await open( page, "data" );
	// a fresh server has no backup yet, and the test that makes one may run later: make one when none is listed
	const restore = page.getByRole( "button", { name: /^Restore / } ).first();
	if ( !await restore.isVisible() ) {
		await page.getByRole( "button", { name: "Make a backup" } ).click();
	}
	await restore.click();
	await expect( page.locator( "#confirmDialog" ) ).toBeVisible();
	await check( page, "confirm dialog", info );
	await page.keyboard.press( "Escape" );

	await freshChat( page, "./" );
	await ask( page, "Show me a list", "Three things" );
	await page.locator( ".chat-bar .ctx-ring" ).click();
	await expect( page.getByRole( "dialog", { name: "Context" } ) ).toBeVisible();
	await check( page, "context drawer", info );
	await page.keyboard.press( "Escape" );

	await page.locator( "#convList li.active" ).getByRole( "button", { name: /^Rename / } ).click();
	await expect( page.locator( "#confirmInput" ) ).toBeVisible();
	await check( page, "rename prompt", info );
} );
