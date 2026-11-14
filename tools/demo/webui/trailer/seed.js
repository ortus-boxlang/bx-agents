/**
 * Fills the demo app with a lived-in history so every page has something on it: conversations (some with the sub-agents), notes,
 * vault entries, routines, access tokens and a backup. It signs in as the demo admin (ada) and calls the API from the page.
 *
 *   NODE_PATH=$(npm root -g) node seed.js --url=http://127.0.0.1:8791
 */
const { chromium } = require( "playwright" );
const args = Object.fromEntries( process.argv.slice( 2 ).map( a => a.replace( /^--/, "" ).split( "=" ) ) );
const base = args.url || "http://127.0.0.1:8791";
const topics = [
	[ "Return policy for sale items", "What is your return policy?" ], [ "Where is order 48213", "Where is my order?" ],
	[ "Shipping to Canada", "How long does shipping take?" ], [ "Damaged parcel", "My parcel arrived damaged, what now?" ],
	[ "Wrong size trail shoes", "I ordered the wrong size, can I return it?" ], [ "Express delivery cutoff", "What is the express shipping cutoff?" ],
	[ "Gift wrap options", "Do you do gift wrap?" ], [ "Warehouse hours", "Are you open right now?" ],
	[ "Refund still missing", "My refund has not arrived" ], [ "Change delivery address", "Can I change the delivery address?" ],
	[ "Bulk order discount", "Do you give a discount on bulk orders?" ], [ "Wool socks care", "How do I wash wool socks?" ],
	[ "Order 48190 tracking", "Where is my order 48190?" ], [ "Return label reprint", "I lost my return label" ],
	[ "Free shipping threshold", "How much for free shipping?" ], [ "Out of stock jacket", "When is the rain jacket back in stock?" ],
	[ "Cancel an order", "Can I cancel my order?" ], [ "Student discount", "Is there a student discount?" ],
	[ "International returns", "Can I return an order from abroad?" ], [ "Late delivery", "My order is late, where is it?" ],
	[ "Weekend delivery", "Do you deliver on Saturday?" ], [ "Pickup point near me", "Which pickup points are near me?" ],
	[ "Exchange for a size up", "Can I exchange for a size up?" ], [ "Sale items refund", "Can I return sale items?" ],
	[ "Shipping cost to Spain", "What does shipping to Spain cost?" ], [ "Two parcels, one order", "Why did my order arrive in two parcels?" ],
	[ "Invoice for order 48120", "Can I get an invoice for my order?" ], [ "Change of email address", "How do I change my email address?" ],
	[ "Backorder date", "When will my backorder ship?" ], [ "Promo code not working", "My promo code is not working" ]
];
( async () => {
	const browser = await chromium.launch();
	const p = await ( await browser.newContext() ).newPage();
	await p.goto( base + "/chat/login.html" );
	await p.fill( "#username", "ada" ); await p.fill( "#password", "demo-pass" );
	await Promise.all( [ p.waitForNavigation().catch( () => {} ), p.click( "button[type=submit]" ) ] );
	await p.waitForTimeout( 1500 );
	const api = ( path, body ) => p.evaluate( async ( [ path, body ] ) => {
		const r = await fetch( "/__bxagents" + path, body === undefined ? {} : { method : "POST", headers : { "content-type" : "application/json", "x-bxagents-csrf" : "1" }, body : JSON.stringify( body ) } );
		return { status : r.status, body : ( await r.text() ).slice( 0, 60000 ) };
	}, [ path, body ] );
	const must = async ( label, promise ) => { const r = await promise; if ( r.status >= 300 ) console.warn( label + " " + r.status + " " + r.body.slice( 0, 200 ) ); return r; };
	const agents = [ "", "", "", "", "researcher", "writer" ];
	let n = 0;
	for ( const [ title, input ] of topics ) {
		const agent = agents[ n++ % agents.length ];
		const made = await must( "session", api( "/sessions", agent ? { title, agent } : { title } ) );
		const id = JSON.parse( made.body ).conversationId;
		await must( "invoke", api( "/invoke", agent ? { input, conversationId : id, agent } : { input, conversationId : id } ) );
		await api( "/sessions/rename", { conversationId : id, title } );
	}
	for ( const text of [ "Prefers email over phone", "Lives in Madrid, orders in euros", "Wears size 42 in trail shoes", "Allergic to wool, ask before suggesting it" ] ) await must( "note", api( "/notes", { scope : "user", text } ) );
	for ( const text of [ "Returns are free for 30 days, sale items are final", "Express orders before 2pm ship the same day", "The warehouse is closed on public holidays" ] ) await must( "agent note", api( "/notes", { scope : "agent", text } ) );
	await must( "vault", api( "/vault", { scope : "user", name : "CARRIER_API_KEY", value : "demo-secret-1", description : "Parcel tracking for my orders", hosts : [ "api.parcelcarrier.example" ] } ) );
	await must( "vault", api( "/vault", { scope : "user", name : "CRM_TOKEN", value : "demo-secret-2", description : "Customer records", hosts : [ "crm.acme.example" ] } ) );
	await must( "vault", api( "/vault", { scope : "agent", name : "SHOP_API_KEY", value : "demo-secret-3", description : "The shop's order system", hosts : [ "shop.acme.example" ] } ) );
	await must( "vault", api( "/vault", { scope : "agent", name : "SLACK_WEBHOOK", value : "demo-secret-4", description : "Posts the daily digest", hosts : [ "hooks.slack.com" ] } ) );
	await must( "routine", api( "/routines", { name : "build-check", schedule : "0 9 * * 1-5", prompt : "Check the build and tell me what broke." } ) );
	await must( "routine", api( "/routines", { name : "weekly-report", schedule : "0 16 * * 5", prompt : "Write the weekly report from this week's notes." } ) );
	await must( "routine", api( "/routines", { name : "refund-sweep", schedule : "every 2h", prompt : "List refunds that have not landed after 5 working days." } ) );
	await must( "run", api( "/routines/run", { name : "build-check" } ) );
	await must( "run", api( "/routines/run", { name : "weekly-report" } ) );
	// the two routines that were made due run within a minute; give their conversations readable titles
	for ( let i = 0; i < 40; i++ ) {
		const listed = JSON.parse( ( await api( "/sessions?source=routine&limit=10" ) ).body ).sessions || [];
		if ( listed.length >= 2 ) {
			for ( const c of listed ) await api( "/sessions/rename", { conversationId : c.id, title : ( /weekly-report/.test( c.title ) ? "Weekly report" : "Build check" ) + " (routine)" } );
			break;
		}
		await p.waitForTimeout( 3000 );
	}
	for ( const name of [ "ci-bot", "support-dashboard", "nightly-export" ] ) await must( "token", api( "/tokens", { name, scope : "chat", expires : "90d" } ) );
	await must( "backup", api( "/data/backup", {} ) );
	console.log( JSON.stringify( await api( "/sessions?facets=1&limit=1" ) ) );
	await browser.close();
} )();
