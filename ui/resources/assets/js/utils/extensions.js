/**
 * What the scripts of extensions (their web/ folder) may use: window.bxagents, the same small contract as the current
 * page (apiBase, icon, conversationId, runCommand, onRefresh, refresh, slot). It is made when App.js loads, before the
 * extensions' deferred scripts run; the chat plugs in what only it knows (the open conversation, running a command).
 *
 * Slots are the places an extension can show something: header, sidebar and composer, the slot-area elements of the
 * chat (marked x-ignore, so Alpine leaves what is drawn there alone).
 */
export const SLOT_AREAS = { header: "slotHeader", sidebar: "slotSidebar", composer: "slotComposer" };

/**
 * @param {string} name An icon of the set
 * @returns {string} Its SVG, as the chat's icon set draws it
 */
export function iconMarkup( name ) {
	return "<svg class=\"i\" aria-hidden=\"true\"><use href=\"#i-" + String( name ).replace( /[^a-z0-9-]/gi, "" ) + "\"/></svg>";
}

/**
 * @param {string} apiBase Where the agent API is
 * @param {Document} doc The page
 * @returns {object} window.bxagents, with plug( chat ) for the chat to fill in
 */
export function createBxagents( apiBase, doc ) {
	let chat = null;
	const listeners = [];
	const api = {
		apiBase,
		icon           : iconMarkup,
		conversationId : () => ( chat ? chat.conversationId() : "" ),
		runCommand     : line => ( chat ? chat.runCommand( line ) : null ),
		onRefresh      : listener => {
			listeners.push( listener );
		},
		refresh : () => chat && chat.refresh(),
		slot    : place => {
			if ( !SLOT_AREAS[ place ] ) {
				throw new Error( "There is no place [" + place + "]. Use header, sidebar or composer." );
			}
			const box = doc.createElement( place === "sidebar" ? "div" : "span" );
			box.className = "slot slot-script";
			const area = doc.getElementById( SLOT_AREAS[ place ] );
			if ( area ) {
				area.appendChild( box );
				area.hidden = false;
			}
			return box;
		}
	};
	Object.defineProperty( api, "plug", {
		enumerable : false,
		value      : impl => {
			chat = impl;
		}
	} );
	Object.defineProperty( api, "notify", {
		enumerable : false,
		value      : () => listeners.forEach( listener => {
			try {
				listener();
			} catch ( e ) {
				console.error( "bxagents.onRefresh listener failed", e );
			}
		} )
	} );
	return api;
}

/**
 * Draws what the extensions' slots hold (GET /slots) into their places. A slot's text is shown as text; only a slot the
 * extension marked html has its string put in as markup (the extension's own). Each draw
 * replaces the slots the server drew and leaves what extension scripts added alone.
 *
 * @param {Document} doc The page
 * @param {Array<{ place: string, extension: string, id: string, text: string, html?: boolean }>} items The slots
 */
export function drawSlots( doc, items ) {
	Object.keys( SLOT_AREAS ).forEach( place => {
		const area = doc.getElementById( SLOT_AREAS[ place ] );
		if ( !area ) {
			return;
		}
		area.querySelectorAll( ".slot-server" ).forEach( old => old.remove() );
		items.filter( item => item.place === place ).forEach( item => {
			const box = doc.createElement( place === "sidebar" ? "div" : "span" );
			box.className = "slot slot-server";
			box.setAttribute( "data-extension", item.extension || "" );
			box.setAttribute( "data-slot", item.id || "" );
			if ( item.html === true ) {
				box.innerHTML = item.text;
			} else {
				box.textContent = item.text;
			}
			area.appendChild( box );
		} );
		area.hidden = area.childElementCount === 0;
	} );
}
