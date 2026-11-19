/**
 * Routines in the new web app: made, run, paused, resumed and deleted through the dev agent's real API; the reports and
 * a gateway's chats through routed answers.
 */
import { test, expect } from "./support.js";

const APP = "/chat";

test( "makes a routine, reads its schedule back, runs, pauses, resumes and deletes it", async( { page, errors } ) => {
	const name = "e2e-" + Date.now().toString( 36 );
	await page.goto( APP + "/routines" );
	await page.getByRole( "button", { name: "New routine" } ).click();
	const editor = page.getByRole( "dialog", { name: "New routine" } );
	await editor.getByRole( "textbox", { name: "Name" } ).fill( name );
	await editor.getByRole( "textbox", { name: "Schedule" } ).fill( "not a schedule" );
	await expect( editor.locator( ".is-bad" ) ).toBeVisible();
	await editor.getByRole( "textbox", { name: "Schedule" } ).fill( "every 1d" );
	await expect( editor.getByText( /next run/ ) ).toBeVisible();
	await editor.getByRole( "textbox", { name: "What the agent should do" } ).fill( "Say hello." );
	await editor.getByRole( "button", { name: "Save" } ).click();
	await expect( editor ).toBeHidden();
	await expect( page.locator( ".toast" ).filter( { hasText: "Saved " + name } ) ).toBeVisible();

	const card = page.getByRole( "list", { name: "Routines" } ).locator( "li" ).filter( { hasText: name } );
	await card.getByRole( "button", { name: "Run routine " + name + " now" } ).click();
	await expect( page.locator( ".toast" ).filter( { hasText: "Marked " + name + " due." } ) ).toBeVisible();
	await card.getByRole( "button", { name: "Pause routine " + name } ).click();
	await expect( card.getByRole( "button", { name: "Resume routine " + name } ) ).toBeVisible();
	await card.getByRole( "button", { name: "Resume routine " + name } ).click();
	await expect( card.getByRole( "button", { name: "Pause routine " + name } ) ).toBeVisible();

	await card.getByRole( "button", { name: "Edit routine " + name } ).click();
	const edit = page.getByRole( "dialog", { name: "Edit " + name } );
	await expect( edit.getByRole( "textbox", { name: "What the agent should do" } ) ).toHaveValue( "Say hello." );
	await expect( edit.getByRole( "textbox", { name: "Name" } ) ).toBeDisabled();
	await edit.getByRole( "button", { name: "Cancel" } ).click();

	await card.getByRole( "button", { name: "Delete routine " + name } ).click();
	await page.locator( "#confirmDialog" ).getByRole( "button", { name: "Delete" } ).click();
	await expect( card ).toHaveCount( 0 );
	expect( errors ).toEqual( [] );
} );

test( "sends the answer to a gateway chat picked from the ones it has talked to", async( { page } ) => {
	await page.route( "**/__bxagents/gateways", route => route.fulfill( {
		json : {
			gateways : [
				{
					name  : "slack",
					type  : "slack",
					state : "connected",
					chats : [
						{ chatId: "C1", lastSeen: Date.UTC( 2026, 10, 18 ) },
						{ chatId: "C2", threadId: "T9", lastSeen: Date.UTC( 2026, 10, 17 ) }
					]
				}
			]
		}
	} ) );
	let saved = null;
	await page.route( "**/__bxagents/routines", route => {
		if ( route.request().method() === "POST" ) {
			saved = route.request().postDataJSON();
			return route.fulfill( { json: { success: true, routine: { name: saved.name } } } );
		}
		return route.fallback();
	} );
	await page.goto( APP + "/routines" );
	await page.getByRole( "button", { name: "New routine" } ).click();
	const editor = page.getByRole( "dialog", { name: "New routine" } );
	await editor.getByRole( "textbox", { name: "Name" } ).fill( "to-slack" );
	await editor.getByRole( "textbox", { name: "Schedule" } ).fill( "every 2h" );
	await editor.getByRole( "textbox", { name: "What the agent should do" } ).fill( "Sum up." );
	await editor.getByRole( "combobox", { name: "Where the answer goes" } ).selectOption( "gateway:slack" );
	await editor.getByRole( "combobox", { name: "Chat", exact: true } ).selectOption( "C2" );
	await editor.getByRole( "button", { name: "Save" } ).click();
	await expect.poll( () => saved ).toEqual( { name: "to-slack", schedule: "every 2h", prompt: "Sum up.", destination: "gateway:slack", chat: "C2" } );
} );

test( "shows the reports, reads one, and asks before cleaning up", async( { page } ) => {
	await page.route( "**/__bxagents/routines?*", route => route.fulfill( { json: { routines: [ { id: "r1", name: "daily", ownerId: "", statusText: "ok", enabled: true, schedule: "every 1d", scheduleText: "every day", destination: "routine" } ] } } ) );
	await page.route( "**/__bxagents/routines", route => route.fulfill( { json: { routines: [ { id: "r1", name: "daily", statusText: "ok", enabled: true, schedule: "every 1d", scheduleText: "every day", destination: "routine" } ] } } ) );
	await page.route( "**/__bxagents/routines/reports?*", route => route.fulfill( { json: { files: [ { file: "2026-11-18.md", bytes: 2048, savedAt: "2026-11-18T09:00:00Z" } ] } } ) );
	await page.route( "**/__bxagents/routines/report?*", route => route.fulfill( { json: { text: "# All green" } } ) );
	const cleans = [];
	await page.route( "**/__bxagents/routines/reports/clean", route => {
		cleans.push( route.request().postDataJSON() );
		return route.fulfill( { json: { count: 3, bytes: 4096 } } );
	} );
	await page.goto( APP + "/routines" );
	await page.getByRole( "button", { name: "Reports of routine daily" } ).click();
	const reports = page.getByRole( "dialog", { name: "Reports of daily" } );
	await expect( reports.getByText( "2 KB, 2026-11-18 09:00" ) ).toBeVisible();
	await reports.getByRole( "button", { name: "View 2026-11-18.md" } ).click();
	await expect( reports.locator( ".report-text" ) ).toHaveText( "# All green" );
	await reports.getByRole( "button", { name: "Check" } ).click();
	await expect( page.locator( "#confirmTitle" ) ).toHaveText( "Delete 3 reports?" );
	await page.locator( "#confirmDialog" ).getByRole( "button", { name: "Cancel" } ).click();
	await expect( reports.getByText( "Nothing was deleted." ) ).toBeVisible();
	expect( cleans.map( c => c.apply ) ).toEqual( [ false ] );
} );
