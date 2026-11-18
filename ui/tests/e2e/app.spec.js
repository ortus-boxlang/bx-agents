/**
 * The new web app (the bxagentsui ColdBox module), mounted at /chat/next while the pages move to it.
 */
import { test, expect } from "./support.js";

const NEXT = "/chat/next";
const PAGES = [ "conversations", "routines", "registry", "connectors", "memory", "vault", "settings", "agent", "gateways", "logs", "access", "data" ];

test( "draws the frame: the menu with both groups for an admin, the title and who is signed in", async ( { page, errors } ) => {
	await page.goto( NEXT + "/" );
	await expect( page.locator( "#mainNav" ) ).toBeVisible();
	await expect( page.locator( "#navGroup-main" ) ).toBeVisible();
	await expect( page.locator( "#navGroup-admin" ) ).toBeVisible();
	await expect( page.locator( "header h1" ) ).toHaveText( "UI Dev" );
	await expect( page.locator( "#whoAmI" ) ).toHaveText( "Ada Lovelace" );
	await expect( page.locator( "a.nav-item[data-page='chat']" ) ).toHaveAttribute( "aria-current", "page" );
	expect( errors ).toEqual( [] );
} );

test( "serves every page of the menu, each marked as the current one", async ( { page, errors } ) => {
	for ( const id of PAGES ) {
		const res = await page.goto( NEXT + "/" + id );
		expect( res.status(), id ).toBe( 200 );
		await expect( page.locator( "a.nav-item[data-page='" + id + "']" ) ).toHaveAttribute( "aria-current", "page" );
		await expect( page.locator( "main .pg-head h1" ) ).toBeVisible();
	}
	expect( errors ).toEqual( [] );
} );

test( "a member sees no admin group and gets 403 on an admin page", async ( { member } ) => {
	await member.goto( NEXT + "/" );
	await expect( member.locator( "#navGroup-main" ) ).toBeVisible();
	await expect( member.locator( "#navGroup-admin" ) ).toBeHidden();
	await expect( member.locator( "a.nav-item[data-page='logs']" ) ).toBeHidden();
	const res = await member.goto( NEXT + "/logs" );
	expect( res.status() ).toBe( 403 );
} );

test( "keeps the theme and the folded menu across pages", async ( { page } ) => {
	await page.goto( NEXT + "/" );
	const wasDark = await page.evaluate( () => document.documentElement.getAttribute( "data-theme" ) === "dark" );
	await page.click( "#themeToggle" );
	await page.click( "#navFold" );
	await expect( page.locator( "body" ) ).toHaveAttribute( "data-nav", "folded" );
	await page.goto( NEXT + "/settings" );
	await expect( page.locator( "html" ) ).toHaveAttribute( "data-theme", wasDark ? "light" : "dark" );
	await expect( page.locator( "body" ) ).toHaveAttribute( "data-nav", "folded" );
	// put both back for the other tests
	await page.click( "#themeToggle" );
	await page.click( "#navFold" );
} );

test( "asks for a sign in first when nobody is signed in", async ( { browser } ) => {
	const context = await browser.newContext();
	const page = await context.newPage();
	await page.goto( NEXT + "/" );
	await expect( page ).toHaveURL( /login\.html/ );
	await context.close();
} );
