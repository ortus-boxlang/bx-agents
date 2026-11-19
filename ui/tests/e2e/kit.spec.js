/**
 * The kit (/chat/_kit, a dev build only): every partial and magic of the web app works as documented.
 */
import { test, expect } from "./support.js";

const KIT = "/chat/_kit";

test.beforeEach( async( { page } ) => {
	await page.goto( KIT );
	await expect( page.locator( "#kit" ) ).toBeVisible();
} );

test( "tabs, search and switch write their component's variables", async( { page, errors } ) => {
	await page.click( "#kit-tabs [data-tab='two']" );
	await expect( page.locator( "#kit-tab" ) ).toHaveText( "two" );
	await expect( page.locator( "#kit-tabs [data-tab='two']" ) ).toHaveAttribute( "aria-current", "page" );
	await page.fill( "#kit-search input", "find me" );
	await expect( page.locator( "#kit-query" ) ).toHaveText( "find me" );
	await page.click( "#kit-field .switch-row" );
	await expect( page.locator( "#kit-switch" ) ).toHaveText( "off" );
	expect( errors ).toEqual( [] );
} );

test( "a field ties its help line to the control", async( { page } ) => {
	await expect( page.locator( "#kit-name" ) ).toHaveAttribute( "aria-describedby", "kit-name-help" );
	await expect( page.locator( "#kit-name-help" ) ).toHaveText( "A help line under the control." );
} );

test( "the modal and the drawer open, and Escape closes them", async( { page } ) => {
	await page.click( "#kit-open-modal" );
	const modal = page.locator( "dialog.dlg[open]" );
	await expect( modal ).toContainText( "Escape or Close shuts it" );
	await page.keyboard.press( "Escape" );
	await expect( modal ).toHaveCount( 0 );
	await page.click( "#kit-open-drawer" );
	await expect( page.locator( "dialog.drawer[open]" ) ).toContainText( "A drawer for a longer task" );
	await page.locator( "dialog.drawer[open] button[aria-label='Close']" ).click();
	await expect( page.locator( "dialog.drawer[open]" ) ).toHaveCount( 0 );
} );

test( "$confirm answers yes, no, and no on Escape", async( { page } ) => {
	await page.click( "#kit-ask" );
	await expect( page.locator( "#confirmTitle" ) ).toHaveText( "Delete this?" );
	await page.click( "#confirmYes" );
	await expect( page.locator( "#kit-answer" ) ).toHaveText( "yes" );
	await page.click( "#kit-ask" );
	await page.click( "#confirmNo" );
	await expect( page.locator( "#kit-answer" ) ).toHaveText( "no" );
	await page.click( "#kit-ask" );
	await page.keyboard.press( "Escape" );
	await expect( page.locator( "#kit-answer" ) ).toHaveText( "no" );
} );

test( "$toast shows a message in the live region", async( { page } ) => {
	await page.click( "#kit-toast-ok" );
	await expect( page.locator( ".toasts .toast.ok" ) ).toContainText( "Saved." );
	await page.click( "#kit-toast-error" );
	await expect( page.locator( ".toasts .toast.error" ) ).toContainText( "Could not save." );
} );

test( "$md draws Markdown and never runs markup; $fmt and the table read the same everywhere", async( { page } ) => {
	await expect( page.locator( "#kit-markdown strong" ) ).toHaveText( "Bold" );
	await expect( page.locator( "#kit-markdown img[onerror]" ) ).toHaveCount( 0 );
	expect( await page.evaluate( () => window.__kitXss ) ).toBeUndefined();
	await expect( page.locator( "#kit-fmt" ) ).toHaveText( "3.3 MB / 3 tools / 2026-11-18 09:30" );
	await expect( page.locator( "#kit-table tbody tr" ) ).toHaveCount( 2 );
	await expect( page.locator( "#kit-table tbody tr" ).nth( 1 ) ).toContainText( "5 MB" );
} );
