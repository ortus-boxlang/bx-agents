/**
 * Every page of the web app over a real server, for each project shape (dev/shapes, served by scripts/shapes.mjs):
 * each page answers, draws its frame with the right addresses, loads its scripts and styles, and logs no error.
 */
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SHAPES = JSON.parse( fs.readFileSync( path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), "../../.stack/shapes.json" ), "utf8" ) );
const PAGES = [
	"",
	"conversations",
	"routines",
	"registry",
	"connectors",
	"memory",
	"vault",
	"settings",
	"agent",
	"gateways",
	"logs",
	"access",
	"data"
];

/**
 * @param {string} name A shape's name, as in ui/dev/shapes
 * @returns {object} The shape from .stack/shapes.json, with its origin
 */
const find = name => {
	const shape = SHAPES.find( s => s.name === name );
	return { ...shape, origin: "http://127.0.0.1:" + shape.port };
};

/**
 * Opens a page and collects what went wrong on it: console errors, uncaught errors, and failed requests.
 *
 * @param {import("@playwright/test").Page} page The page
 * @returns {string[]} The problems, filled as the page runs
 */
function watch( page ) {
	const problems = [];
	page.on( "pageerror", e => problems.push( "error: " + e.message ) );
	page.on( "console", m => m.type() === "error" && problems.push( "console: " + m.text() ) );
	page.on( "response", r => r.status() >= 400 && problems.push( r.status() + " " + r.url() ) );
	return problems;
}

for ( const name of [
	"open-support",
	"password",
	"nested-api"
] ) {
	test.describe( name, () => {
		const shape = find( name );
		// the password shape is opened with its password saved, as after the person typed it once
		test.beforeEach( async( { page } ) => {
			if ( shape.env.SHAPE_API_KEY ) {
				await page.addInitScript( key => localStorage.setItem( "bxagents_webui_api_key", key ), shape.env.SHAPE_API_KEY );
			}
		} );

		test( "serves every page at " + shape.base + ", with its frame, its files and no error", async( { page } ) => {
			const problems = watch( page );
			for ( const id of PAGES ) {
				const res = await page.goto( shape.origin + shape.base + "/" + id );
				expect( res.status(), id || "chat" ).toBe( 200 );
				await page.waitForLoadState( "networkidle" );
				await expect( page.locator( "#mainNav" ) ).toBeVisible();
				const config = JSON.parse( await page.locator( "#bxagents-config" ).textContent() );
				expect( config.basePath ).toBe( shape.base );
				expect( config.apiBase ).toBe( shape.apiBase );
				await expect( page.locator( "a.nav-item[aria-current='page']" ) ).toHaveAttribute( "data-page", id || "chat" );
			}
			expect( problems ).toEqual( [] );
		} );

		test( "answers 404 for a page it does not have, and serves no sign-in form without accounts", async( { request } ) => {
			expect( ( await request.get( shape.origin + shape.base + "/nope" ) ).status() ).toBe( 404 );
			expect( ( await request.get( shape.origin + shape.base + "/a/b/c" ) ).status() ).toBe( 404 );
			expect( ( await request.get( shape.origin + shape.base + "/login.html" ) ).status() ).toBe( 404 );
		} );

		test( "serves the files of the project's extensions under its path, and the chat draws their slot", async( { page, request } ) => {
			const file = await request.get( shape.origin + shape.base + "/ext/panel/panel.js" );
			expect( file.status() ).toBe( 200 );
			expect( await file.text() ).toContain( "bxagents" );
			await page.goto( shape.origin + shape.base + "/" );
			await expect( page.locator( "#slotSidebar .slot-server strong" ) ).toHaveText( "panel" );
		} );

		test( "talks to the agent API at " + shape.apiBase, async( { page } ) => {
			const asked = page.waitForResponse( r => r.url().includes( shape.apiBase + "/sessions" ) );
			await page.goto( shape.origin + shape.base + "/conversations" );
			expect( ( await asked ).status() ).toBe( 200 );
		} );
	} );
}

test( "open-support: the gateway's icon, tab icon, theme and title", async( { page } ) => {
	const shape = find( "open-support" );
	await page.goto( shape.origin + shape.base + "/" );
	await expect( page.locator( "header .icon use" ) ).toHaveAttribute( "href", "#i-lightning" );
	await expect( page.locator( "link[rel='icon']" ) ).toHaveAttribute( "href", /^data:image\/svg\+xml,/ );
	await expect( page ).toHaveTitle( "Chat - Support" );
	const accent = await page.evaluate( () => getComputedStyle( document.documentElement ).getPropertyValue( "--accent" ).trim() );
	expect( accent ).toBe( "#0f766e" );
} );

test( "password: without the password the API refuses and the page asks for it; with it, the API answers", async( { page, request } ) => {
	const shape = find( "password" );
	expect( ( await request.get( shape.origin + shape.apiBase + "/info" ) ).status() ).toBe( 401 );
	expect( ( await request.get( shape.origin + shape.apiBase + "/info", { headers: { "x-bxagents-token": shape.env.SHAPE_API_KEY } } ) ).status() ).toBe( 200 );
	await page.goto( shape.origin + shape.base + "/" );
	await expect( page.locator( "#keyPanel" ) ).toBeVisible();
	await page.locator( "#keyInput" ).fill( shape.env.SHAPE_API_KEY );
	await page.locator( "#keyPanel" ).getByRole( "button", { name: /Save|Use/ } ).click();
	await expect( page.locator( "#keyPanel" ) ).toBeHidden();
	await expect( page.locator( "#keyBtn" ) ).toBeVisible();
} );
