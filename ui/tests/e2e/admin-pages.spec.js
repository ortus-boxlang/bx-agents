/**
 * The admin pages of the new web app: Data and backups, Logs, Gateways. Real agent API where it is cheap and safe, a
 * routed answer where a state cannot be made on demand (a failing gateway).
 */
import { test, expect } from "./support.js";

const NEXT = "/chat/next";

test.describe( "Data and backups", () => {
	test( "shows where everything is kept and makes a backup that shows in the list", async ( { page, errors } ) => {
		// count the backups only once they have loaded
		const listed = page.waitForResponse( r => r.url().endsWith( "/__bxagents/data/backups" ) );
		await page.goto( NEXT + "/data" );
		await listed;
		await expect( page.getByText( "Data home:" ) ).toBeVisible();
		await expect( page.getByRole( "table", { name: "Folders of the data home" } ).locator( "tbody tr" ).first() ).toBeVisible();
		const before = await page.getByRole( "table", { name: "Backups" } ).locator( "tbody tr" ).count();
		await page.getByRole( "button", { name: "Make a backup" } ).click();
		await expect( page.locator( ".toast" ).filter( { hasText: /Made backup-/ } ) ).toBeVisible();
		await expect( page.getByRole( "table", { name: "Backups" } ).locator( "tbody tr" ) ).toHaveCount( before + 1 );
		expect( errors ).toEqual( [] );
	} );

	test( "asks before a restore and does nothing on Cancel", async ( { page } ) => {
		let restored = false;
		await page.route( "**/__bxagents/data/restore", route => {
			restored = true;
			return route.fulfill( { json: { note: "Scheduled." } } );
		} );
		await page.goto( NEXT + "/data" );
		const restore = page.getByRole( "button", { name: /^Restore / } ).first();
		await expect( restore ).toBeVisible();
		await restore.click();
		await expect( page.locator( "#confirmDialog" ) ).toBeVisible();
		await page.locator( "#confirmDialog" ).getByRole( "button", { name: "Cancel" } ).click();
		expect( restored ).toBe( false );
	} );
} );

test.describe( "Logs", () => {
	test( "opens the area and search from the address, and keeps a new area in it", async ( { page, errors } ) => {
		await page.goto( NEXT + "/logs/agent?q=nothing-matches-this" );
		await expect( page.getByRole( "searchbox", { name: "Search the log" } ) ).toHaveValue( "nothing-matches-this" );
		await expect( page.locator( ".pg-tabs a[aria-current='page']" ) ).toContainText( "Agent" );
		await expect( page.getByText( "Nothing logged here yet that matches." ) ).toBeVisible();
		await page.getByRole( "searchbox", { name: "Search the log" } ).fill( "" );
		// the heartbeat writes from the start, so it has lines
		await page.locator( ".pg-tabs a", { hasText: "Heartbeat" } ).click();
		await expect( page ).toHaveURL( /\/logs\/heartbeat$/ );
		await expect( page.getByRole( "list", { name: "Log lines" } ).locator( "li:not(.logs-empty)" ).first() ).toBeVisible();
		expect( errors ).toEqual( [] );
	} );

	test( "asks the API again with the level filter", async ( { page } ) => {
		await page.goto( NEXT + "/logs/api" );
		const asked = page.waitForRequest( req => req.url().includes( "/__bxagents/logs?" ) && req.url().includes( "level=error" ) );
		await page.getByRole( "combobox", { name: "Level" } ).selectOption( "error" );
		await asked;
	} );
} );

test.describe( "Gateways", () => {
	const answer = {
		gateways: [
			{ name       : "slack", type       : "slack", state      : "failing", credentials: [ { env: "SLACK_TOKEN", set: false } ],
				lastError  : { message: "invalid_auth", at: "2026-11-18T09:00:00Z" }, chats      : [ { chatId: "C1", threadId: "", lastSeen: Date.UTC( 2026, 10, 18, 9, 30 ) } ] },
			{ name: "gone", type: "telegram", state: "missing", credentials: [], chats: [] }
		]
	};

	test( "shows each gateway's state, credentials, last error with its log, and its chats", async ( { page, errors } ) => {
		await page.route( "**/__bxagents/gateways", route => route.fulfill( { json: answer } ) );
		await page.goto( NEXT + "/gateways" );
		const slack = page.locator( "li.card" ).filter( { hasText: "slack" } ).first();
		await expect( slack.locator( ".chip.bad" ) ).toHaveText( "Failing" );
		await expect( slack.getByText( "SLACK_TOKEN: NOT SET" ) ).toBeVisible();
		await expect( slack.getByText( /Last error 2026-11-18 09:00: invalid_auth/ ) ).toBeVisible();
		await expect( slack.getByRole( "link", { name: "Open log" } ) ).toHaveAttribute( "href", "/chat/next/logs/gateways?q=slack" );
		await expect( slack.getByRole( "cell", { name: "2026-11-18 09:30" } ) ).toBeVisible();
		await expect( page.getByRole( "button", { name: "Reconnect gone" } ) ).toBeDisabled();
		expect( errors ).toEqual( [] );
	} );

	test( "reconnects a gateway and says so", async ( { page } ) => {
		await page.route( "**/__bxagents/gateways", route => route.fulfill( { json: answer } ) );
		await page.route( "**/__bxagents/gateways/reconnect", route => route.fulfill( { json: { success: true } } ) );
		await page.goto( NEXT + "/gateways" );
		await page.getByRole( "button", { name: "Reconnect slack" } ).click();
		await expect( page.locator( ".toast" ).filter( { hasText: "Reconnected slack." } ) ).toBeVisible();
	} );

	test( "says when nothing is set up", async ( { page } ) => {
		await page.route( "**/__bxagents/gateways", route => route.fulfill( { json: { gateways: [] } } ) );
		await page.goto( NEXT + "/gateways" );
		await expect( page.getByText( "No gateways are set up" ) ).toBeVisible();
	} );
} );
