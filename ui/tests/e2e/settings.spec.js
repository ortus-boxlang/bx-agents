/**
 * The Settings page of the new web app: appearance kept in the same format as the current page, the model, the
 * extensions and the server.
 */
import { test, expect } from "./support.js";

const NEXT = "/chat/next";

test( "keeps the mode, accent, size and density in the current page's format, and Reset brings the defaults back", async ( { page, errors } ) => {
	await page.goto( NEXT + "/settings" );
	await page.getByRole( "group", { name: "Mode" } ).getByRole( "button", { name: "Dark" } ).click();
	await page.getByRole( "button", { name: "Teal" } ).click();
	await page.getByRole( "group", { name: "Text size" } ).getByRole( "button", { name: "Large" } ).click();
	await page.getByRole( "group", { name: "Density" } ).getByRole( "button", { name: "Compact" } ).click();
	const kept = await page.evaluate( () => [ localStorage.getItem( "bxagents_webui_theme" ), JSON.parse( localStorage.getItem( "bxagents_webui_appearance" ) ) ] );
	expect( kept ).toEqual( [ "dark", { accent: "#0f9d8a", size: "large", density: "compact" } ] );

	// another page opens with the same look, before any script runs
	await page.goto( NEXT + "/data" );
	await expect( page.locator( "html" ) ).toHaveAttribute( "data-theme", "dark" );
	await expect( page.locator( "html" ) ).toHaveAttribute( "data-density", "compact" );
	expect( await page.evaluate( () => getComputedStyle( document.documentElement ).getPropertyValue( "--accent" ).trim() ) ).toBe( "#0f9d8a" );

	await page.goto( NEXT + "/settings" );
	await page.getByRole( "button", { name: "Reset to defaults" } ).click();
	await expect( page.locator( "html" ) ).not.toHaveAttribute( "data-theme", /.+/ );
	await expect( page.locator( "html" ) ).not.toHaveAttribute( "data-density", /.+/ );
	expect( await page.evaluate( () => localStorage.getItem( "bxagents_webui_theme" ) ) ).toBeNull();
	expect( errors ).toEqual( [] );
} );

test( "refuses an accent that is not a colour", async ( { page } ) => {
	await page.goto( NEXT + "/settings" );
	const hex = page.getByRole( "textbox", { name: "Accent color as hex" } );
	await hex.fill( "nope" );
	await hex.press( "Enter" );
	await hex.blur();
	await expect( hex ).toHaveAttribute( "aria-invalid", "true" );
	await hex.fill( "#7048e8" );
	await hex.blur();
	await expect( hex ).toHaveAttribute( "aria-invalid", "false" );
	await expect( page.getByText( /: 1 on buttons/ ) ).toBeVisible();
	await page.getByRole( "button", { name: "Reset to defaults" } ).click();
} );

test( "offers the profiles and keeps the choice where the chat reads it", async ( { page } ) => {
	await page.goto( NEXT + "/settings" );
	const pick = page.getByRole( "combobox", { name: "Model for your next messages" } );
	await expect( pick.locator( "option" ) ).toHaveCount( 3 );
	await pick.selectOption( "fast" );
	await expect( page.locator( ".toast" ).filter( { hasText: /The next messages use fast/ } ) ).toBeVisible();
	expect( await page.evaluate( () => localStorage.getItem( "bxagents_webui_profile" ) ) ).toBe( "fast" );
	await pick.selectOption( "" );
} );

test( "shows the server and, for an admin, the extensions", async ( { page } ) => {
	await page.goto( NEXT + "/settings" );
	await expect( page.locator( ".facts" ) ).toContainText( "ui-dev" );
	await expect( page.getByRole( "heading", { name: "Extensions" } ) ).toBeVisible();
} );

test( "a member sees no extensions card", async ( { member } ) => {
	await member.goto( NEXT + "/settings" );
	await expect( member.locator( ".facts" ) ).toContainText( "ui-dev" );
	await expect( member.getByRole( "heading", { name: "Extensions" } ) ).toBeHidden();
} );
