/**
 * Memory and Agent in the new web app, against the dev agent's real API (notes are cheap to add and remove), with a
 * routed answer where a state cannot be made on demand (sub-agents, usage on).
 */
import { test, expect } from "./support.js";

const NEXT = "/chat/next";

test.describe( "Memory", () => {
	test( "adds, edits and removes a note about you", async ( { page, errors } ) => {
		const text = "Prefers short answers " + Date.now();
		await page.goto( NEXT + "/memory" );
		const about = page.getByRole( "region", { name: "About you" } );
		await about.getByRole( "textbox", { name: "Add a note: About you" } ).fill( text );
		await about.getByRole( "button", { name: "Add" } ).click();
		const row = about.locator( "li" ).filter( { hasText: text } );
		await expect( row ).toBeVisible();
		await expect( about.getByRole( "textbox", { name: "Add a note: About you" } ) ).toHaveValue( "" );

		await row.getByRole( "button", { name: /^Edit the note / } ).click();
		await about.getByRole( "textbox", { name: "Note text" } ).fill( text + " edited" );
		await about.getByRole( "textbox", { name: "Note text" } ).press( "Enter" );
		const edited = about.locator( "li" ).filter( { hasText: text + " edited" } );
		await expect( edited ).toBeVisible();

		await edited.getByRole( "button", { name: /^Remove the note / } ).click();
		await expect( page.locator( "#confirmBody" ) ).toHaveText( text + " edited" );
		await page.locator( "#confirmDialog" ).getByRole( "button", { name: "Remove" } ).click();
		await expect( edited ).toHaveCount( 0 );
		expect( errors ).toEqual( [] );
	} );

	test( "Escape leaves a note unchanged", async ( { page } ) => {
		const text = "Escape test " + Date.now();
		await page.goto( NEXT + "/memory" );
		const about = page.getByRole( "region", { name: "About you" } );
		await about.getByRole( "textbox", { name: "Add a note: About you" } ).fill( text );
		await about.getByRole( "button", { name: "Add" } ).click();
		const row = about.locator( "li" ).filter( { hasText: text } );
		await row.getByRole( "button", { name: /^Edit the note / } ).click();
		await about.getByRole( "textbox", { name: "Note text" } ).fill( "changed" );
		await about.getByRole( "textbox", { name: "Note text" } ).press( "Escape" );
		await expect( row ).toContainText( text );
		await row.getByRole( "button", { name: /^Remove the note / } ).click();
		await page.locator( "#confirmDialog" ).getByRole( "button", { name: "Remove" } ).click();
	} );

	test( "a member cannot remove the agent's notes", async ( { member } ) => {
		await member.route( "**/__bxagents/notes", route => route.fulfill( { json: { success: true,
			user   : { notes: [], stats: { used: 0, limit: 2000 } },
			agent  : { notes: [ { id: "a1", text: "Deploys go out on Fridays" } ], stats: { used: 25, limit: 2000 } } } } ) );
		await member.goto( NEXT + "/memory" );
		const notes = member.getByRole( "region", { name: "Notes of the agent" } );
		await expect( notes.getByText( "Deploys go out on Fridays" ) ).toBeVisible();
		await expect( notes.getByRole( "button", { name: "Remove the note a1" } ) ).toBeHidden();
		await expect( notes.getByRole( "button", { name: "Edit the note a1" } ) ).toBeVisible();
	} );

	test( "shows the conversation memory and clears one after asking", async ( { page } ) => {
		await page.route( "**/__bxagents/sessions?*", route => route.fulfill( { json: { total: 30, sessions: [ { id: "c1", title: "Plan", messageCount: 6, updatedAt: "2026-11-18T09:00:00Z" } ] } } ) );
		let cleared = null;
		await page.route( "**/__bxagents/memory/clear", route => {
			cleared = route.request().postDataJSON();
			return route.fulfill( { json: { success: true } } );
		} );
		await page.goto( NEXT + "/memory" );
		const memory = page.getByRole( "list", { name: "Conversation memory" } );
		await expect( memory.getByText( "6 messages" ) ).toBeVisible();
		await expect( page.getByText( "Showing the newest 1 of 30." ) ).toBeVisible();
		await page.getByRole( "button", { name: "Clear the memory of Plan" } ).click();
		await expect( page.locator( "#confirmTitle" ) ).toHaveText( "Forget the 6 messages of this conversation?" );
		await page.locator( "#confirmDialog" ).getByRole( "button", { name: "Clear" } ).click();
		await expect.poll( () => cleared ).toEqual( { conversationId: "c1" } );
	} );
} );

test.describe( "Agent", () => {
	test( "shows the composition and keeps the moving lines switch", async ( { page, errors } ) => {
		await page.goto( NEXT + "/agent" );
		await expect( page.getByRole( "region", { name: "The agent" } ).getByText( "ui-dev" ) ).toBeVisible();
		await page.getByText( "Stop the moving lines" ).click();
		await expect( page.locator( ".comp" ) ).toHaveClass( /still/ );
		expect( await page.evaluate( () => localStorage.getItem( "bxagents.motion" ) ) ).toBe( "off" );
		await page.reload();
		await expect( page.locator( ".comp" ) ).toHaveClass( /still/ );
		await page.getByText( "Stop the moving lines" ).click();
		expect( errors ).toEqual( [] );
	} );

	test( "talks to a sub-agent in the chat", async ( { page } ) => {
		await page.route( "**/__bxagents/agent/composition", route => route.fulfill( { json: {
			agents: [ { name: "ui-dev", parent: "" }, { name: "helper", parent: "ui-dev", model: "fast-model" } ], incoming: [], outgoing: [], parts: [] } } ) );
		let asked = null;
		await page.route( "**/__bxagents/sessions", route => {
			asked = route.request().postDataJSON();
			return route.fulfill( { json: { success: true, conversationId: "sub-1" } } );
		} );
		await page.goto( NEXT + "/agent" );
		await page.getByRole( "button", { name: "Talk to helper" } ).click();
		await expect( page ).toHaveURL( /\/chat\/?$/ );
		expect( asked ).toEqual( { agent: "helper" } );
		expect( await page.evaluate( () => localStorage.getItem( "bxagents_webui_conversation" ) ) ).toBe( "sub-1" );
	} );

	test( "reads a project file", async ( { page } ) => {
		await page.goto( NEXT + "/agent/files" );
		await page.getByRole( "button", { name: "Read Agent.yaml" } ).click();
		await expect( page.getByRole( "region", { name: "File" } ).locator( "pre" ) ).toContainText( "name:" );
	} );

	test( "shows usage by model and asks again for another period", async ( { page } ) => {
		const asked = [];
		await page.route( "**/__bxagents/usage?*", route => {
			asked.push( new URL( route.request().url() ).searchParams.get( "days" ) );
			return route.fulfill( { json: { enabled         : true, calls           : 3, totalTokens     : 90, promptTokens    : 60, completionTokens: 30,
				byModel         : [ { name: "fast-model", calls: 3, promptTokens: 60, completionTokens: 30, totalTokens: 90 } ], byDay           : [] } } );
		} );
		await page.goto( NEXT + "/agent/usage" );
		await expect( page.getByRole( "table", { name: "By model" } ).getByRole( "cell", { name: "fast-model" } ) ).toBeVisible();
		await expect( page.getByText( "60 in, 30 out" ) ).toBeVisible();
		await page.getByRole( "combobox", { name: "Period" } ).selectOption( "7" );
		await expect.poll( () => asked.at( -1 ) ).toBe( "7" );
	} );
} );
