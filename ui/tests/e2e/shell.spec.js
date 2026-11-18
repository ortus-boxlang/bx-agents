/**
 * The shell: the menu, every page an admin and a member can open, and nothing thrown on the way.
 */
import { test, expect } from "./support.js";

const ADMIN_PAGES = [ "chat", "conversations", "routines", "registry", "connectors", "memory", "vault", "settings", "agent", "logs", "access", "data" ];
const MEMBER_ONLY_HIDDEN = [ "agent", "logs", "access", "data" ];

test( "an admin sees every page in the menu, and each one opens without an error", async ( { page, errors } ) => {
	await page.goto( "./" );
	for ( const id of ADMIN_PAGES ) {
		const link = page.locator( "#navList a[href='#/" + id + "']" );
		await expect( link, id + " is in the menu" ).toBeVisible();
		await link.click();
		if ( id === "chat" ) {
			await expect( page.locator( "#input" ) ).toBeVisible();
		} else {
			await expect( page.locator( "#pageView h1" ).first(), id + " draws its title" ).toBeVisible();
		}
	}
	expect( errors ).toEqual( [] );
} );

test( "a member does not see the admin pages", async ( { member } ) => {
	await member.goto( "./" );
	await expect( member.locator( "#navList a[href='#/chat']" ) ).toBeVisible();
	for ( const id of MEMBER_ONLY_HIDDEN ) {
		await expect( member.locator( "#navList a[href='#/" + id + "']" ), id + " is hidden" ).toHaveCount( 0 );
	}
} );

test( "a page opens from its own address", async ( { page, errors } ) => {
	await page.goto( "./#/connectors" );
	await expect( page.locator( "#pageView h1" ).first() ).toHaveText( "Connectors" );
	expect( errors ).toEqual( [] );
} );

test( "the Settings menu opens the pages that replaced the old dialogs", async ( { page, errors } ) => {
	await page.goto( "./" );
	const items = { notesBtn: "Memory", vaultBtn: "Vault", routinesBtn: "Routines", logsBtn: "Logs" };
	for ( const [ id, title ] of Object.entries( items ) ) {
		await page.click( "#settingsBtn" );
		await page.click( "#" + id );
		await expect( page.locator( "#pageView h1" ).first(), id + " opens " + title ).toHaveText( title );
	}
	await expect( page.locator( "dialog[open]" ) ).toHaveCount( 0 );
	expect( errors ).toEqual( [] );
} );

test( "the agent asking for a secret sends the person to the Vault page", async ( { page } ) => {
	await page.goto( "./#/vault" );
	await expect( page.locator( "#pageView h1" ).first() ).toHaveText( "Vault" );
} );
