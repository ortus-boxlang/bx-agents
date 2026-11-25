/**
 * Embeds: the admin page (make one, check the website rules, watch the preview follow the form, copy a snippet, rotate the
 * key, turn it off), and what a visitor of ANOTHER website can and cannot do. The other websites are real servers on other
 * ports: a page made with route.fulfill is treated by Chromium as a public address and cannot call a local server, so a
 * "blocked" result from it would prove nothing about CORS.
 *
 * The preflight a browser sends is asked of the server directly (Playwright does not list it).
 */
import http from "node:http";
import { test, expect } from "./support.js";

const AGENT = "http://127.0.0.1:" + ( process.env.UI_AGENT_PORT || 8780 );
const API = AGENT + "/__bxagents";
const ALLOWED_PORT = 39100;
const OTHER_PORT = 39200;
const ALLOWED = "http://127.0.0.1:" + ALLOWED_PORT;
const OTHER = "http://127.0.0.1:" + OTHER_PORT;
const JSON_HEADERS = { "Content-Type": "application/json", "x-bxagents-csrf": "1", "x-bxagents-source": "web" };

/**
 * @param {number} port Where the "website" listens
 * @param {() => string} embedId The embed it shows
 * @returns {Promise<http.Server>} The server
 */
function website( port, embedId ) {
	return new Promise( resolve => {
		const server = http.createServer( ( req, res ) => {
			res.setHeader( "Content-Type", "text/html" );
			if ( req.url.startsWith( "/frame" ) ) {
				res.end( `<!doctype html><title>Framing page</title><iframe id="chat" title="Docs chat" src="${ API }/embed/${ embedId() }/frame" style="width:420px;height:560px"></iframe>` );
				return;
			}
			res.end( `<!doctype html><title>Docs site</title><h1>Docs</h1><script src="${ API }/embed/widget.js" data-embed="${ embedId() }" defer></script>` );
		} ).listen( port, "127.0.0.1", () => resolve( server ) );
	} );
}

/**
 * @param {import("@playwright/test").APIRequestContext} request A signed-in request context (an admin)
 * @returns {Promise<string>} The name the dev agent gives its time tool (the model calls it when asked what time it is)
 */
async function timeTool( request ) {
	const res = await request.get( API + "/embeds", { headers: JSON_HEADERS } );
	const name = ( await res.json() ).tools.find( t => /^now\b/.test( t ) );
	expect( name, "the dev agent has a time tool" ).toBeTruthy();
	return name;
}

/**
 * @param {import("@playwright/test").APIRequestContext} request A signed-in request context (an admin)
 * @param {object} fields The embed
 * @returns {Promise<object>} The embed made
 */
async function makeEmbed( request, fields ) {
	const res = await request.post( API + "/embeds", { headers: JSON_HEADERS, data: { name: "Test embed", limits: { allowedOrigins: [ ALLOWED ], perVisitorPerMinute: 30, dailyMessages: 500 }, ...fields } } );
	expect( res.status(), await res.text() ).toBe( 200 );
	return res.json();
}

/**
 * @param {import("@playwright/test").APIRequestContext} request Any request context
 * @param {string} id The embed
 * @param {string} origin The website the visitor is on
 * @returns {Promise<string>} A session token
 */
async function sessionFor( request, id, origin = ALLOWED ) {
	const res = await request.post( API + "/embed/" + id + "/session", { headers: { Origin: origin } } );
	expect( res.status() ).toBe( 200 );
	return ( await res.json() ).token;
}

/**
 * @param {import("@playwright/test").APIRequestContext} request Any request context
 * @param {string} id The embed
 * @param {string} token A session token
 * @param {object} body The message
 * @returns {Promise<{ status: number, text: string }>} The status and the whole stream as text
 */
async function say( request, id, token, body ) {
	const res = await request.post( API + "/embed/" + id + "/events", { headers: { Origin: ALLOWED, Authorization: "Bearer " + token, "Content-Type": "application/json" }, data: body } );
	return { status: res.status(), text: await res.text() };
}

/**
 * @param {string} stream An event stream as text
 * @returns {string} What the model said, from the content deltas
 */
function spoken( stream ) {
	return [ ...stream.matchAll( /"content"\s*:\s*"((?:[^"\\]|\\.)*)"/g ) ].map( m => JSON.parse( "\"" + m[ 1 ] + "\"" ) ).join( "" );
}

test.describe( "The Embeds page", () => {
	test( "is in the Admin menu, makes an embed, refuses bad websites, previews live, copies a snippet, rotates and turns off", async( { page, context, errors } ) => {
		await context.grantPermissions( [
			"clipboard-read",
			"clipboard-write"
		], { origin: AGENT } );
		await page.goto( "/chat/embeds" );
		await expect( page.getByRole( "heading", { name: "Embeds", level: 1 } ) ).toBeVisible();
		await expect( page.locator( "nav" ).getByRole( "link", { name: "Embeds" } ) ).toBeVisible();

		await page.locator( "#newEmbed" ).click();
		await expect( page.locator( "#embedName" ) ).toBeFocused();
		// nothing can be saved without a name and a website: the page says so in words
		await page.locator( "#saveEmbed" ).click();
		await expect( page.getByText( "Give it a name of 1 to 80 characters." ) ).toBeVisible();
		await expect( page.getByText( "List at least one website that may show it." ) ).toBeVisible();

		await page.locator( "#embedOrigin" ).fill( "https://*.example.com" );
		await page.locator( "#addOrigin" ).click();
		await expect( page.locator( "#embedOriginError" ) ).toContainText( "No wildcards" );
		await page.locator( "#embedOrigin" ).fill( "https://docs.example.com/page" );
		await page.keyboard.press( "Enter" );
		await expect( page.locator( "#embedOriginError" ) ).toContainText( "no path" );
		await page.locator( "#embedOrigin" ).fill( ALLOWED );
		await page.keyboard.press( "Enter" );
		await expect( page.getByRole( "list", { name: "Allowed websites" } ).getByRole( "button", { name: "Remove " + ALLOWED } ) ).toBeVisible();

		const name = "Page test " + Date.now();
		await page.locator( "#embedName" ).fill( name );
		await page.locator( "#embedTitle" ).fill( "Ask the docs" );
		await page.locator( "#embedWelcome" ).fill( "Welcome from the form." );
		await page.locator( "#embedSuggestion" ).fill( "How do I start?" );
		await page.keyboard.press( "Enter" );
		await page.locator( "#embedColor" ).fill( "#0f766e" );
		await page.locator( "#embedPosition" ).selectOption( "bottom-left" );
		await page.locator( "label.check" ).first().locator( "input" ).check();

		// the preview is the real widget, drawn from the form as it is typed
		const preview = page.locator( "bx-agent[mode=preview]" );
		await expect( preview.locator( "h2" ) ).toHaveText( "Ask the docs" );
		await expect( preview.locator( ".msg.bot" ).first() ).toHaveText( "Welcome from the form." );
		await expect( preview.locator( ".suggestions button" ) ).toHaveText( [ "How do I start?" ] );
		await page.locator( "#embedTitle" ).fill( "Docs assistant" );
		await expect( preview.locator( "h2" ) ).toHaveText( "Docs assistant" );
		await expect( preview ).toHaveAttribute( "data-position", "bottom-left" );
		await page.locator( "#embedTheme" ).selectOption( "dark" );
		await expect( preview ).toHaveAttribute( "data-theme", "dark" );
		await page.locator( "#embedTheme" ).selectOption( "auto" );

		await page.locator( "#saveEmbed" ).click();
		await expect( page.locator( ".toast" ).filter( { hasText: "Made " + name } ) ).toBeVisible();
		const item = page.locator( ".embeds-item" ).filter( { hasText: name } );
		await expect( item ).toContainText( "On" );

		// the snippets are for this embed, with a note each, and Copy puts the text on the clipboard
		const id = ( await page.locator( "[role=tabpanel]:visible code" ).textContent() ).match( /emb_[A-Za-z0-9]{10}/ )[ 0 ];
		for ( const tab of [
			"HTML",
			"iframe",
			"Web component",
			"curl"
		] ) {
			await page.getByRole( "tab", { name: tab } ).click();
			await expect( page.locator( "[role=tabpanel]:visible code" ) ).toContainText( id );
			await expect( page.locator( "[role=tabpanel]:visible .pg-note" ) ).not.toBeEmpty();
		}
		await page.getByRole( "tab", { name: "HTML" } ).click();
		await page.getByRole( "button", { name: "Copy the HTML snippet" } ).click();
		expect( await page.evaluate( () => navigator.clipboard.readText() ) ).toContain( "data-embed=\"" + id + "\"" );
		// the counters are an honest empty state, not zeros
		await expect( page.getByText( "No visits yet." ) ).toBeVisible();

		await page.locator( "#rotateEmbed" ).click();
		await expect( page.locator( "#confirmTitle" ) ).toContainText( "Rotate the key" );
		await page.locator( "#confirmNo" ).click();
		await page.locator( "#rotateEmbed" ).click();
		await page.locator( "#confirmYes" ).click();
		await expect( page.locator( ".toast" ).filter( { hasText: "New key, version 2" } ) ).toBeVisible();

		await page.locator( "#toggleEmbed" ).click();
		await page.locator( "#confirmYes" ).click();
		await expect( item ).toContainText( "Off" );
		await expect( page.locator( "#toggleEmbed" ) ).toHaveText( "Enable" );
		expect( errors ).toEqual( [] );
	} );

	test( "is refused to a member, in the page and in the API", async( { member } ) => {
		const res = await member.goto( "/chat/embeds" );
		expect( res.status() ).toBe( 403 );
		const api = await member.request.get( API + "/embeds", { headers: JSON_HEADERS } );
		expect( api.status() ).toBe( 403 );
		const make = await member.request.post( API + "/embeds", { headers: JSON_HEADERS, data: { name: "x", limits: { allowedOrigins: [ ALLOWED ] } } } );
		expect( make.status() ).toBe( 403 );
	} );
} );

// a visitor is anonymous: the default `request` of these tests carries ada's session cookie, which a visitor never has
const visitorTest = test.extend( {
	visitor : async( { playwright }, use ) => {
		const context = await playwright.request.newContext( { storageState: { cookies: [], origins: [] } } );
		await use( context );
		await context.dispose();
	}
} );

test.describe( "A visitor of another website", () => {
	let embed = { id: "" };
	let now = "";
	let sites = [];

	test.beforeAll( async( { playwright } ) => {
		const admin = await playwright.request.newContext( { storageState: ( await import( "./support.js" ) ).AUTH + "ada.json" } );
		now = await timeTool( admin );
		embed = await makeEmbed( admin, { name: "Visitor test", tools: [ now ], look: { title: "Ask the docs", welcome: "Hi, visitor.", suggestions: [ "When are you open?" ] } } );
		await admin.dispose();
		sites = [
			await website( ALLOWED_PORT, () => embed.id ),
			await website( OTHER_PORT, () => embed.id )
		];
	} );

	test.afterAll( async() => {
		sites.forEach( s => s.close() );
	} );

	visitorTest( "chats from an allowed website, in pieces rather than one block, and the transcript survives a reload", async( { browser } ) => {
		const context = await browser.newContext( { storageState: { cookies: [], origins: [] } } );
		const page = await context.newPage();
		const consoleErrors = [];
		page.on( "pageerror", e => consoleErrors.push( e.message ) );
		await page.goto( ALLOWED + "/" );
		const launcher = page.locator( "bx-agent .launcher" );
		await expect( launcher ).toBeVisible();
		await expect( launcher ).toHaveAttribute( "aria-label", "Open chat" );
		await launcher.click();
		// opening moves focus to the input, and Esc closes and hands it back to the launcher
		await expect( page.locator( "bx-agent textarea" ) ).toBeFocused();
		await page.keyboard.press( "Escape" );
		await expect( page.locator( "bx-agent .panel" ) ).toBeHidden();
		await expect( launcher ).toBeFocused();
		await launcher.click();

		// count how often the answer text changes: one buffered block would be a single update
		await page.evaluate( () => {
			window.__updates = 0;
			new MutationObserver( ms => {
				for ( const m of ms ) {
					const node = m.target.nodeType === 3 ? m.target.parentElement : m.target;
					if ( node && node.classList && node.classList.contains( "bot" ) ) { window.__updates++; }
				}
			} ).observe( document.querySelector( "bx-agent" ).shadowRoot, { subtree: true, characterData: true, childList: true } );
		} );
		await page.locator( "bx-agent .suggestions button" ).click();
		await expect( page.locator( "bx-agent .msg.bot" ).last() ).toContainText( "Our warehouse is open", { timeout: 30_000 } );
		await expect( page.locator( "bx-agent .send" ) ).toHaveText( "Send" );
		expect( await page.evaluate( () => window.__updates ) ).toBeGreaterThanOrEqual( 4 );
		// the finished answer is announced once, from the status region, not piece by piece
		await expect( page.locator( "bx-agent [aria-live=polite]" ) ).toContainText( "Answer: Our warehouse is open" );

		await page.reload();
		await page.locator( "bx-agent .launcher" ).click();
		await expect( page.locator( "bx-agent .msg" ) ).toHaveCount( 2 );
		await expect( page.locator( "bx-agent .msg.user" ) ).toHaveText( "When are you open?" );
		expect( consoleErrors ).toEqual( [] );
		await context.close();
	} );

	visitorTest( "gets nothing on a website that is not listed: no launcher, no config, no session, no CORS header", async( { browser, visitor } ) => {
		const context = await browser.newContext( { storageState: { cookies: [], origins: [] } } );
		const page = await context.newPage();
		await page.goto( OTHER + "/" );
		await page.waitForTimeout( 1500 );
		expect( await page.evaluate( () => !!document.querySelector( "bx-agent" )?.shadowRoot?.querySelector( ".launcher" ) ) ).toBe( false );
		await context.close();

		for ( const path of [
			"/config",
			"/session"
		] ) {
			const res = await visitor.fetch( API + "/embed/" + embed.id + path, { method: path === "/session" ? "POST" : "GET", headers: { Origin: OTHER } } );
			expect( res.status(), path ).toBe( 403 );
			expect( res.headers()[ "access-control-allow-origin" ], path ).toBeUndefined();
		}
		// what the browser asks before a cross-origin POST: answered for the listed website only
		const yes = await visitor.fetch( API + "/embed/" + embed.id + "/events", { method: "OPTIONS", headers: { Origin: ALLOWED, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type" } } );
		expect( yes.headers()[ "access-control-allow-origin" ] ).toBe( ALLOWED );
		expect( yes.headers()[ "access-control-allow-credentials" ] ).toBeUndefined();
		const no = await visitor.fetch( API + "/embed/" + embed.id + "/events", { method: "OPTIONS", headers: { Origin: OTHER, "Access-Control-Request-Method": "POST" } } );
		expect( no.headers()[ "access-control-allow-origin" ] ).toBeUndefined();
	} );

	visitorTest( "refuses a forged, other-origin or missing token with 401, and a website that is not listed with 403", async( { visitor } ) => {
		const good = await sessionFor( visitor, embed.id );
		const stream = headers => visitor.post( API + "/embed/" + embed.id + "/events", { headers: { "Content-Type": "application/json", ...headers }, data: { input: "hi" } } );
		expect( ( await stream( { Origin: ALLOWED } ) ).status() ).toBe( 401 );
		expect( ( await stream( { Origin: ALLOWED, Authorization: "Bearer not.a.token" } ) ).status() ).toBe( 401 );
		expect( ( await stream( { Origin: ALLOWED, Authorization: "Bearer " + good.slice( 0, -2 ) + "xx" } ) ).status() ).toBe( 401 );
		expect( ( await stream( { Origin: OTHER, Authorization: "Bearer " + good } ) ).status() ).toBe( 403 );
		// a token for this embed, from the agent's own origin, is another origin than the one it was issued to
		expect( ( await stream( { Origin: AGENT, Authorization: "Bearer " + good } ) ).status() ).toBe( 401 );
		// it is not an access token either: no other route takes it
		for ( const path of [
			"/embeds",
			"/notes",
			"/sessions",
			"/vault"
		] ) {
			const res = await visitor.get( API + path, { headers: { Authorization: "Bearer " + good, Origin: ALLOWED } } );
			expect( [
				401,
				403
			], path ).toContain( res.status() );
		}
	} );

	visitorTest( "ignores a user id, an agent, a profile and tools sent in the body, and runs only the embed's own tools", async( { visitor, playwright } ) => {
		const admin = await playwright.request.newContext( { storageState: ( await import( "./support.js" ) ).AUTH + "ada.json" } );
		const bare = await makeEmbed( admin, { name: "No tools", tools: [] } );
		const token = await sessionFor( visitor, bare.id );
		const forged = { input: "which tools do you have?", userId: "ada", agent: "helper", profile: "planner", tools: [ now ], options: { profile: "planner", userId: "ada" }, scope: "admin" };
		const none = await say( visitor, bare.id, token, forged );
		expect( none.status ).toBe( 200 );
		// the model was offered nothing at all, whatever the body asked for
		expect( spoken( none.text ) ).toMatch( /offered these tools: \s*\./ );
		const noTime = await say( visitor, bare.id, token, { input: "what time is it", tools: [ now ] } );
		// the scripted model answers "It is **<what the tool said>**": with no tool offered there is nothing between the stars
		expect( spoken( noTime.text ) ).toMatch( /^It is \*{4}\.$/ );

		const withTool = await sessionFor( visitor, embed.id );
		const time = await say( visitor, embed.id, withTool, { input: "what time is it" } );
		expect( spoken( time.text ) ).toMatch( /^It is \*\*[^*]+\*\*\.$/ );
		const offered = await say( visitor, embed.id, withTool, { input: "which tools do you have?" } );
		expect( spoken( offered.text ) ).toMatch( /now/ );
		expect( spoken( offered.text ) ).not.toMatch( /vault|note|skill|delete/ );
		await admin.dispose();
	} );

	visitorTest( "limits a visitor per minute (429) and refuses a message of 2001 characters (400)", async( { visitor, playwright } ) => {
		const admin = await playwright.request.newContext( { storageState: ( await import( "./support.js" ) ).AUTH + "ada.json" } );
		const small = await makeEmbed( admin, { name: "Small limits", limits: { allowedOrigins: [ ALLOWED ], perVisitorPerMinute: 2, dailyMessages: 500, maxMessageChars: 2000 } } );
		const token = await sessionFor( visitor, small.id );
		expect( ( await say( visitor, small.id, token, { input: "x".repeat( 2001 ) } ) ).status ).toBe( 400 );
		expect( ( await say( visitor, small.id, token, { input: "one" } ) ).status ).toBe( 200 );
		expect( ( await say( visitor, small.id, token, { input: "two" } ) ).status ).toBe( 200 );
		expect( ( await say( visitor, small.id, token, { input: "three" } ) ).status ).toBe( 429 );
		// another visitor is counted on its own
		expect( ( await say( visitor, small.id, await sessionFor( visitor, small.id ), { input: "hello" } ) ).status ).toBe( 200 );
		const usage = await ( await admin.get( API + "/embeds/usage?id=" + small.id, { headers: JSON_HEADERS } ) ).json();
		expect( usage.messages ).toBe( 3 );
		expect( usage.limited ).toBe( 1 );
		await admin.dispose();
	} );

	visitorTest( "answers a disabled, an expired and an unknown embed the same way", async( { visitor, playwright } ) => {
		const admin = await playwright.request.newContext( { storageState: ( await import( "./support.js" ) ).AUTH + "ada.json" } );
		const off = await makeEmbed( admin, { name: "To disable" } );
		const old = await makeEmbed( admin, { name: "To expire" } );
		await admin.post( API + "/embeds/update", { headers: JSON_HEADERS, data: { id: off.id, enabled: false } } );
		await admin.post( API + "/embeds/update", { headers: JSON_HEADERS, data: { id: old.id, expires: new Date( Date.now() - 3600_000 ).toISOString() } } );
		const asked = async id => {
			const res = await visitor.get( API + "/embed/" + id + "/config", { headers: { Origin: ALLOWED } } );
			return { status: res.status(), body: await res.text() };
		};
		const unknown = await asked( "emb_0000000000" );
		expect( unknown.status ).toBe( 404 );
		expect( await asked( off.id ) ).toEqual( unknown );
		expect( await asked( old.id ) ).toEqual( unknown );
		await admin.dispose();
	} );

	visitorTest( "stops showing the bubble on the next page load after the embed is turned off (no cached config)", async( { browser, playwright } ) => {
		const admin = await playwright.request.newContext( { storageState: ( await import( "./support.js" ) ).AUTH + "ada.json" } );
		const mine = await makeEmbed( admin, { name: "To turn off" } );
		const own = await website( OTHER_PORT + 1, () => mine.id );
		const context = await browser.newContext( { storageState: { cookies: [], origins: [] } } );
		const page = await context.newPage();
		// this website is the embed's own, so list it
		await admin.post( API + "/embeds/update", { headers: JSON_HEADERS, data: { id: mine.id, limits: { allowedOrigins: [ "http://127.0.0.1:" + ( OTHER_PORT + 1 ) ] } } } );
		await page.goto( "http://127.0.0.1:" + ( OTHER_PORT + 1 ) + "/" );
		await expect( page.locator( "bx-agent .launcher" ) ).toBeVisible();
		await admin.post( API + "/embeds/update", { headers: JSON_HEADERS, data: { id: mine.id, enabled: false } } );
		await page.reload();
		await page.waitForTimeout( 1000 );
		expect( await page.evaluate( () => !!document.querySelector( "bx-agent" )?.shadowRoot?.querySelector( ".launcher" ) ) ).toBe( false );
		await context.close();
		own.close();
		await admin.dispose();
	} );

	visitorTest( "loads the hosted page in a frame on an allowed website, and Chromium blocks it on any other", async( { browser } ) => {
		const context = await browser.newContext( { storageState: { cookies: [], origins: [] } } );
		const allowed = await context.newPage();
		await allowed.goto( ALLOWED + "/frame" );
		const frame = allowed.frameLocator( "#chat" );
		await expect( frame.locator( "bx-agent .panel" ) ).toBeVisible( { timeout: 20_000 } );
		await expect( frame.locator( "bx-agent h2" ) ).toHaveText( "Ask the docs" );

		const other = await context.newPage();
		const refused = [];
		other.on( "console", m => /frame-ancestors/.test( m.text() ) && refused.push( m.text() ) );
		await other.goto( OTHER + "/frame" );
		await expect.poll( () => refused.length, { timeout: 10_000 } ).toBeGreaterThan( 0 );
		expect( await other.locator( "#chat" ).count() ).toBe( 1 );
		expect( other.frames().some( f => f !== other.mainFrame() && f.url().includes( "/embed/" ) ) ).toBe( false );
		await context.close();
	} );
} );
