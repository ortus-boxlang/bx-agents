/**
 * Access, Registry, Vault and Conversations in the new web app. Real agent API where it is cheap and safe, a routed
 * answer where a state cannot be made on demand (tokens are off on the dev agent).
 */
import { test, expect } from "./support.js";

const APP = "/chat";

test.describe( "Access", () => {
	test( "opens People when this server does not manage tokens, and keeps the tab in the address", async ( { page, errors } ) => {
		await page.goto( APP + "/access" );
		await expect( page.getByRole( "list", { name: "People" } ).getByText( "Ada Lovelace" ) ).toBeVisible();
		await expect( page.getByRole( "button", { name: "Make bob an admin" } ) ).toBeVisible();
		await page.locator( ".pg-tabs a", { hasText: "Tokens" } ).click();
		await expect( page ).toHaveURL( /\/access\/tokens$/ );
		await expect( page.getByText( "This server does not manage tokens from here." ) ).toBeVisible();
		expect( errors ).toEqual( [] );
	} );

	test( "makes a token, shows it once, and asks before a revoke", async ( { page } ) => {
		let tokens = [ { name: "ci", status: "active", scope: "chat", lastUsedAt: "" } ];
		await page.route( "**/__bxagents/agent", async route => {
			const res = await route.fetch();
			const body = await res.json();
			body.capabilities.tokens = true;
			await route.fulfill( { response: res, json: body } );
		} );
		await page.route( "**/__bxagents/tokens", route => {
			if ( route.request().method() === "POST" ) {
				tokens = [ ...tokens, { name: "deploy", status: "active", scope: "admin" } ];
				return route.fulfill( { json: { success: true, name: "deploy", token: "bxa_secret_once" } } );
			}
			return route.fulfill( { json: { success: true, tokens } } );
		} );
		let revoked = false;
		await page.route( "**/__bxagents/tokens/revoke", route => {
			revoked = true;
			return route.fulfill( { json: { success: true } } );
		} );
		await page.goto( APP + "/access/tokens" );
		await page.getByRole( "textbox", { name: "Token name" } ).fill( "deploy" );
		await page.getByRole( "combobox", { name: "Scope" } ).selectOption( "admin" );
		await page.getByRole( "button", { name: "Make a token" } ).click();
		await expect( page.getByText( "bxa_secret_once" ) ).toBeVisible();
		await expect( page.getByRole( "list", { name: "Tokens" } ).locator( "li" ) ).toHaveCount( 2 );
		await page.getByRole( "button", { name: "Revoke ci" } ).click();
		await page.locator( "#confirmDialog" ).getByRole( "button", { name: "Cancel" } ).click();
		expect( revoked ).toBe( false );
		await page.getByRole( "button", { name: "Revoke ci" } ).click();
		await page.locator( "#confirmDialog" ).getByRole( "button", { name: "Revoke" } ).click();
		await expect( page.locator( ".toast" ).filter( { hasText: "Revoked ci." } ) ).toBeVisible();
		expect( revoked ).toBe( true );
	} );
} );

test.describe( "Registry", () => {
	test( "groups the tools, searches them, and opens a tab from the address", async ( { page, errors } ) => {
		await page.goto( APP + "/registry" );
		await expect( page.locator( "section.card" ).first() ).toBeVisible();
		await page.getByRole( "searchbox", { name: "Search the tools" } ).fill( "zz-no-tool-zz" );
		await expect( page.getByText( "No tool matches that." ) ).toBeVisible();
		await page.goto( APP + "/registry/volumes" );
		await expect( page.locator( ".pg-tabs a[aria-current='page']" ) ).toContainText( "Volumes" );
		expect( errors ).toEqual( [] );
	} );

	test( "reads a skill", async ( { page } ) => {
		await page.route( "**/__bxagents/skills", route => route.fulfill( { json: { skills: [ { name: "release-notes", description: "Write them", origin: "agent" } ] } } ) );
		await page.route( "**/__bxagents/skills/read?*", route => route.fulfill( { json: { body: "# Release notes\nSteps.", origin: "agent", size: 22 } } ) );
		await page.goto( APP + "/registry/skills" );
		await page.getByRole( "button", { name: "Read the skill release-notes" } ).click();
		const reader = page.getByRole( "region", { name: "Skill reader" } );
		await expect( reader.locator( "pre" ) ).toContainText( "# Release notes" );
		await expect( reader ).toContainText( "Written by the agent. 22 bytes." );
		await reader.getByRole( "button", { name: "Close" } ).click();
		await expect( reader ).toBeHidden();
	} );
} );

test.describe( "Vault", () => {
	test( "adds, edits and removes a secret of your own, never showing its value", async ( { page, errors } ) => {
		const name = "E2E_SECRET_" + Date.now();
		await page.goto( APP + "/vault" );
		await page.getByRole( "textbox", { name: "Name" } ).fill( name );
		await page.getByRole( "textbox", { name: "Value" } ).fill( "s3cr3t-value" );
		await page.getByRole( "textbox", { name: "What it is for" } ).last().fill( "A test" );
		await page.getByRole( "button", { name: "Add the secret" } ).click();
		const row = page.getByRole( "list", { name: "Secrets" } ).locator( "li" ).filter( { hasText: name } );
		await expect( row ).toContainText( "A test · any host · never used" );
		await expect( page.getByRole( "textbox", { name: "Value" } ) ).toHaveValue( "" );
		expect( await page.content() ).not.toContain( "s3cr3t-value" );

		await row.getByRole( "button", { name: "Edit " + name } ).click();
		await row.getByRole( "textbox", { name: "Hosts" } ).fill( "api.example.com" );
		await row.getByRole( "button", { name: "Save" } ).click();
		await expect( row ).toContainText( "api.example.com" );

		await row.getByRole( "button", { name: "Remove " + name } ).click();
		await page.locator( "#confirmDialog" ).getByRole( "button", { name: "Remove" } ).click();
		await expect( row ).toHaveCount( 0 );
		expect( errors ).toEqual( [] );
	} );

	test( "shows what the agent asked for and fills in its name", async ( { page } ) => {
		await page.goto( APP + "/vault?ask=GITHUB_TOKEN&scope=user&why=To+read+your+issues." );
		await expect( page.getByText( "The agent asked for GITHUB_TOKEN." ) ).toBeVisible();
		await expect( page.getByText( "To read your issues. Type it below" ) ).toBeVisible();
		await expect( page.getByRole( "textbox", { name: "Name" } ) ).toHaveValue( "GITHUB_TOKEN" );
		await expect( page.getByRole( "textbox", { name: "Value" } ) ).toBeFocused();
	} );

	test( "a member cannot change the agent's secrets", async ( { member } ) => {
		await member.goto( APP + "/vault" );
		await member.locator( ".pg-tabs a", { hasText: "The agent's" } ).click();
		await expect( member.getByText( "Changing them takes an admin." ) ).toBeVisible();
		await expect( member.getByRole( "button", { name: "Add the secret" } ) ).toBeHidden();
	} );
} );

test.describe( "Conversations", () => {
	const page1 = {
		total   : 2,
		facets  : { agent: { main: 1, helper: 1 }, source: { web: 2 } },
		sessions: [
			{ id: "c1", title: "Plan the launch", agent: "main", source: "web", messageCount: 4, updatedAt: "2026-11-18T09:00:00Z" },
			{ id: "c2", title: "", agent: "helper", source: "web", messageCount: 2, updatedAt: "2026-11-17T09:00:00Z" }
		]
	};

	test( "lists, filters by agent, renames with a dialog and deletes the selection", async ( { page, errors } ) => {
		const asked = [];
		await page.route( "**/__bxagents/sessions?*", route => {
			asked.push( route.request().url() );
			return route.fulfill( { json: page1 } );
		} );
		const posted = [];
		await page.route( "**/__bxagents/sessions/*", route => {
			posted.push( [ new URL( route.request().url() ).pathname.split( "/" ).pop(), route.request().postDataJSON() ] );
			return route.fulfill( { json: { success: true } } );
		} );
		await page.goto( APP + "/conversations" );
		await expect( page.getByRole( "link", { name: "Plan the launch" } ) ).toBeVisible();
		await expect( page.getByRole( "link", { name: "Untitled" } ) ).toBeVisible();
		await expect( page.getByText( "Showing 1 to 2 of 2" ) ).toBeVisible();

		await page.getByRole( "button", { name: "helper (1)" } ).click();
		await expect.poll( () => asked.at( -1 ) ).toContain( "agent=helper" );
		await expect( page ).toHaveURL( /agent=helper/ );

		await page.getByRole( "button", { name: "Rename Plan the launch" } ).click();
		await page.locator( "#confirmInput" ).fill( "Launch plan" );
		await page.locator( "#confirmInput" ).press( "Enter" );
		await expect.poll( () => posted.find( p => p[ 0 ] === "rename" ) ).toEqual( [ "rename", { conversationId: "c1", title: "Launch plan" } ] );

		await page.getByRole( "checkbox", { name: "Select every conversation on this page" } ).check();
		await expect( page.getByText( "2 selected" ) ).toBeVisible();
		await page.getByRole( "button", { name: "Delete selected" } ).click();
		await expect( page.locator( "#confirmTitle" ) ).toHaveText( "Delete 2 conversations?" );
		await page.locator( "#confirmDialog" ).getByRole( "button", { name: "Delete" } ).click();
		await expect.poll( () => posted.filter( p => p[ 0 ] === "delete" ).length ).toBe( 2 );
		expect( errors ).toEqual( [] );
	} );

	test( "opens a conversation in the chat", async ( { page } ) => {
		await page.route( "**/__bxagents/sessions?*", route => route.fulfill( { json: page1 } ) );
		await page.goto( APP + "/conversations" );
		await page.getByRole( "link", { name: "Plan the launch" } ).click();
		await expect( page ).toHaveURL( /\/chat\/?$/ );
		expect( await page.evaluate( () => localStorage.getItem( "bxagents_webui_conversation" ) ) ).toBe( "c1" );
	} );

	test( "lists the real conversations of the dev agent", async ( { page } ) => {
		await page.goto( APP + "/conversations" );
		await expect( page.getByRole( "table", { name: "Conversations" } ).locator( "tbody tr" ).first() ).toBeVisible();
	} );
} );
