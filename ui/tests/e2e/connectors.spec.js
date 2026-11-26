/**
 * Connectors in the new web app. The dev agent's catalog lists real connectors, but connecting one needs a real
 * service, so the actions run against routed answers shaped like GET /connectors.
 */
import { test, expect } from "./support.js";

const APP = "/chat";

const catalog = () => ( {
	success    : true,
	policy     : { count: 3, excluded: [ "stripe" ] },
	categories : [
		"Developer",
		"Productivity"
	],
	summary    : { toolsOn: 41, toolWarning: 40, over: true, byConnector: { github: 12 } },
	connectors : [
		{
			id            : "github",
			name          : "GitHub",
			summary       : "Issues and pull requests",
			state         : "connected",
			connectedWith : "token",
			ways          : [
				"bearer",
				"oauth"
			],
			category : "Developer",
			risk     : "medium",
			host     : "api.github.com",
			icon     : "git-branch"
		},
		{
			id      : "linear",
			name    : "Linear",
			summary : "Issues",
			state   : "available",
			ways    : [
				"bearer",
				"oauth"
			],
			category  : "Productivity",
			risk      : "high",
			riskNote  : "It can delete issues.",
			host      : "mcp.linear.app",
			tokenName : "LINEAR_TOKEN",
			options   : [ { key: "readonly", label: "Read only", type: "boolean", value: true, onlyWith: "bearer" } ]
		},
		{ id: "git", name: "Git", category: "Developer", summary: "Local repositories", state: "available", transport: "stdio", program: "uvx", risk: "low" },
		{ id: "notion", name: "Notion", summary: "Pages", state: "needs_attention", reason: "The token was refused.", ways: [ "oauth" ], category: "Productivity", risk: "low", host: "mcp.notion.com" }
	]
} );

/**
 * Routes GET /connectors to the catalog above and records what the page posts.
 */
async function routeCatalog( page ) {
	const posted = [];
	await page.route( "**/__bxagents/connectors", route => route.fulfill( { json: catalog() } ) );
	await page.route( "**/__bxagents/connectors/*", route => {
		const url = new URL( route.request().url() );
		if ( route.request().method() === "POST" ) {
			posted.push( [
				url.pathname.split( "/" ).pop(),
				route.request().postDataJSON()
			] );
		}
		if ( url.pathname.endsWith( "/tools" ) ) {
			return route.fulfill( {
				json : {
					success : true,
					summary : { over: false },
					tools   : [
						{ name: "list_issues", description: "List them", on: true, readOnly: true },
						{ name: "delete_repo", on: false, destructive: true, readOnly: false, locked: true },
						{ name: "create_issue", on: true, readOnly: false }
					]
				}
			} );
		}
		return route.fulfill( { json: { success: true } } );
	} );
	return posted;
}

test( "shows the catalog: tabs with counts, the banner, states and what each person may do", async( { page, errors } ) => {
	await routeCatalog( page );
	await page.goto( APP + "/connectors" );
	await expect( page.getByRole( "navigation", { name: "Connectors" } ).getByRole( "link", { name: /Needs attention/ } ) ).toContainText( "1" );
	await expect( page.getByText( "Catalog: 3 of 4 connectors available." ) ).toBeVisible();
	await expect( page.getByText( "Left out: stripe." ) ).toBeVisible();
	await expect( page.getByText( "Models answer better with fewer than 40." ) ).toBeVisible();

	// the cards sit under a heading for their category, in the order the server gave
	await expect( page.locator( ".conn-group-title" ) ).toHaveText( [
		"Developer",
		"Productivity"
	] );
	await expect( page.getByRole( "region", { name: "Developer" } ).getByRole( "article" ) ).toHaveCount( 2 );

	const github = page.getByRole( "article", { name: "GitHub" } );
	await expect( github ).toContainText( "You connected with your own token · 12 tools on" );
	await expect( github.getByRole( "button", { name: "Tools of GitHub" } ) ).toBeVisible();
	await expect( github.getByRole( "button", { name: "Disconnect GitHub" } ) ).toBeVisible();
	await expect( page.getByRole( "article", { name: "Notion" } ).getByRole( "button", { name: "Reconnect Notion" } ) ).toBeVisible();
	await expect( page.getByRole( "article", { name: "Git", exact: true } ).getByRole( "button", { name: "Switch on Git" } ) ).toBeVisible();

	await page.getByRole( "navigation", { name: "Connectors" } ).getByRole( "link", { name: /^Connected/ } ).click();
	await expect( page ).toHaveURL( /\/connectors\/connected$/ );
	await expect( page.getByRole( "article" ) ).toHaveCount( 1 );
	await page.getByRole( "searchbox", { name: "Search the connectors" } ).fill( "zzz" );
	await expect( page.getByText( "No connector matches that." ) ).toBeVisible();
	expect( errors ).toEqual( [] );
} );

test( "connects with a token: asks to confirm the risk, sends the options, and clears the token", async( { page } ) => {
	const posted = await routeCatalog( page );
	await page.goto( APP + "/connectors" );
	await page.getByRole( "button", { name: "Connect Linear" } ).click();
	const dialog = page.getByRole( "dialog", { name: "Connect Linear" } );
	await expect( dialog.getByText( "High risk." ) ).toBeVisible();
	await expect( dialog.getByLabel( "Read only" ) ).toBeChecked();
	await dialog.getByLabel( "Your token" ).fill( "lin_secret" );
	await dialog.getByRole( "button", { name: "Connect" } ).click();
	await expect( dialog.getByText( "Tick the box to say you have read this." ) ).toBeVisible();
	await dialog.getByLabel( "I have read this and want to connect Linear." ).check();
	await dialog.getByLabel( "Your token" ).fill( "lin_secret" );
	await dialog.getByRole( "button", { name: "Connect" } ).click();
	await expect( dialog ).toBeHidden();
	await expect( page.locator( ".toast" ).filter( { hasText: "Connected to Linear." } ) ).toBeVisible();
	expect( posted.find( p => p[ 0 ] === "connect" )[ 1 ] ).toEqual( { id: "linear", method: "token", confirm: true, options: { readonly: true }, token: "lin_secret" } );
	expect( await page.content() ).not.toContain( "lin_secret" );
} );

test( "a sign in hides the token options and offers the link the server answered", async( { page } ) => {
	await routeCatalog( page );
	await page.route( "**/__bxagents/connectors/connect", route => route.fulfill( { json: { success: true, authorizationUrl: "https://mcp.linear.app/authorize?x=1" } } ) );
	await page.addInitScript( () => {
		window.open = () => null;
	} );
	await page.goto( APP + "/connectors" );
	await page.getByRole( "button", { name: "Connect Linear" } ).click();
	const dialog = page.getByRole( "dialog", { name: "Connect Linear" } );
	await dialog.getByLabel( "Sign in with Linear" ).check();
	await expect( dialog.getByLabel( "Read only" ) ).toHaveCount( 0 );
	await dialog.getByLabel( "I have read this and want to connect Linear." ).check();
	await dialog.getByRole( "button", { name: "Continue to mcp.linear.app" } ).click();
	await expect( dialog.getByRole( "link", { name: "Open the sign in for Linear" } ) ).toHaveAttribute( "href", "https://mcp.linear.app/authorize?x=1" );
	await dialog.getByRole( "button", { name: "Cancel" } ).click();
	await expect( dialog ).toBeHidden();
} );

test( "the tools drawer switches tools, shows locks and filters", async( { page } ) => {
	const posted = await routeCatalog( page );
	await page.goto( APP + "/connectors" );
	await page.getByRole( "button", { name: "Tools of GitHub" } ).click();
	const drawer = page.getByRole( "dialog", { name: "GitHub tools" } );
	await expect( drawer.getByText( "2 of 3 on." ) ).toBeVisible();
	await expect( drawer.locator( "li" ).first() ).toContainText( "create_issue" );
	await expect( drawer.locator( "#tool-delete_repo" ) ).toBeDisabled();
	await expect( drawer.locator( "li", { hasText: "delete_repo" } ).getByText( "Turned off by your admin" ) ).toBeVisible();
	// every switch but the locked one can be used (an undefined binding once disabled them all)
	await expect( drawer.getByRole( "checkbox", { name: "create_issue" } ) ).toBeEnabled();
	await drawer.getByRole( "checkbox", { name: "list_issues" } ).uncheck();
	await expect.poll( () => posted.find( p => p[ 0 ] === "tools" ) ).toEqual( [
		"tools",
		{ tool: "list_issues", on: false, id: "github" }
	] );
	await drawer.getByRole( "button", { name: "Read only" } ).click();
	await expect.poll( () => posted.filter( p => p[ 0 ] === "tools" ).length ).toBe( 2 );
	await drawer.getByRole( "searchbox", { name: "Search the tools" } ).fill( "issue" );
	await expect( drawer.getByText( "Showing 2 of 3." ) ).toBeVisible();
} );

test( "a member cannot switch a local program on", async( { member } ) => {
	await member.route( "**/__bxagents/connectors", route => route.fulfill( { json: catalog() } ) );
	await member.goto( APP + "/connectors" );
	const git = member.getByRole( "article", { name: "Git", exact: true } );
	await expect( git ).toContainText( "An admin switches it on for everyone who uses this agent." );
	await expect( git.getByRole( "button" ) ).toHaveCount( 0 );
} );

test( "lists the dev agent's real catalog", async( { page } ) => {
	await page.goto( APP + "/connectors" );
	await expect( page.getByRole( "article" ).first() ).toBeVisible();
} );
