/**
 * What the browser tests share: signed in pages, and a guard that fails a test on any error the page throws.
 */
import { test as base, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";

/** Where global-setup keeps the signed in sessions */
export const AUTH = fileURLToPath( new URL( "../../.stack/auth/", import.meta.url ) );

/**
 * A test with `page` signed in as ada (an admin), `member` as bob, and `errors`: every uncaught error and console error.
 */
export const test = base.extend( {
	storageState: AUTH + "ada.json",
	errors      : async ( { page }, use ) => {
		const seen = [];
		page.on( "pageerror", e => seen.push( "pageerror: " + e.message ) );
		page.on( "console", m => m.type() === "error" && !/Failed to load resource/.test( m.text() ) && seen.push( "console: " + m.text() ) );
		await use( seen );
	},
	member: async ( { browser }, use ) => {
		const context = await browser.newContext( { storageState: AUTH + "bob.json" } );
		await use( await context.newPage() );
		await context.close();
	}
} );

export { expect };

/**
 * Opens the chat on a new conversation, so a test never sees another test's messages.
 *
 * @param {import("@playwright/test").Page} page The page
 * @returns {Promise<void>}
 */
export async function freshChat( page ) {
	await page.goto( "./" );
	await expect( page.locator( "#input" ) ).toBeVisible();
	// the last conversation loads after the page: let it, so it cannot replace the new one afterwards
	await page.waitForLoadState( "networkidle" );
	await page.click( "#newBtn" );
	await expect( page.locator( "#messages" ) ).toContainText( "Hi! This agent answers from a script" );
	await expect( page.locator( "#messages" ) ).not.toContainText( "scripted answer" );
}

/**
 * Sends one message in the chat and waits until the answer holds the text expected, and the turn has ended.
 *
 * @param {import("@playwright/test").Page} page The page
 * @param {string} text What to send
 * @param {string} expected Text the answer contains
 * @returns {Promise<void>}
 */
export async function ask( page, text, expected ) {
	await page.fill( "#input", text );
	await page.click( "#sendBtn" );
	await expect( page.locator( "#messages" ) ).toContainText( expected, { timeout: 30_000 } );
	await expect( page.locator( "#stopBtn" ) ).toBeHidden( { timeout: 30_000 } );
}
