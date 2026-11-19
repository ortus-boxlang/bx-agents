/**
 * The one way the web app talks to the agent API: every call answers { ok, status, data, error } and never throws for an
 * HTTP error, so a page has one shape to handle. It sends the headers the API asks of a page (who is calling, and that a
 * script of the page made the request, which a form from another site cannot do).
 */

const HEADERS = { "x-bxagents-source": "web", "x-bxagents-csrf": "1" };

/** Where this browser keeps the password (API key) of an agent without accounts: the same key as the current page */
export const KEY_STORAGE = "bxagents_webui_api_key";

/**
 * @returns {string} The password kept in this browser, or ""
 */
export function savedKey() {
	try {
		return localStorage.getItem( KEY_STORAGE ) || "";
	} catch ( e ) {
		return "";
	}
}

/**
 * Keeps the password in this browser, or forgets it.
 *
 * @param {string} value The password, or "" to forget it
 */
export function saveKey( value ) {
	try {
		if ( value ) {
			localStorage.setItem( KEY_STORAGE, value );
		} else {
			localStorage.removeItem( KEY_STORAGE );
		}
	} catch ( e ) {
		// not kept: asked again next time
	}
}

/**
 * @returns {object} The headers every call sends: who is asking, that a script of the page asks, and the password
 *          when this browser keeps one
 */
export function authHeaders() {
	const key = savedKey();
	return key ? { ...HEADERS, "x-bxagents-token": key } : { ...HEADERS };
}

/**
 * @param {string} apiBase Where the agent API is (/__bxagents)
 * @param {typeof fetch} [fetchImpl] The fetch to use (a test passes its own)
 * @param {Function} [onRefused] Called with the status when the server refuses the caller (401): the page asks for the
 *        password
 * @returns {{ get: Function, post: Function, url: Function }} The client
 */
export function createApi( apiBase, fetchImpl = ( ...args ) => fetch( ...args ), onRefused = () => {} ) {
	/**
	 * @param {string} path A path under the API, with its query
	 * @returns {string} The address
	 */
	const url = path => apiBase + path;

	/**
	 * @param {string} method GET or POST
	 * @param {string} path A path under the API
	 * @param {object} [body] For a POST, sent as JSON
	 * @param {{ signal?: AbortSignal }} [options] Abort when the page leaves
	 * @returns {Promise<{ ok: boolean, status: number, data: any, error: string }>} What came back
	 */
	async function call( method, path, body, options = {} ) {
		const init = { method, headers: authHeaders(), signal: options.signal };
		if ( method === "POST" ) {
			init.headers[ "Content-Type" ] = "application/json";
			init.body = JSON.stringify( body || {} );
		}
		let res;
		try {
			res = await fetchImpl( url( path ), init );
		} catch ( e ) {
			if ( e && e.name === "AbortError" ) {
				return { ok: false, status: 0, data: null, error: "", aborted: true };
			}
			return { ok: false, status: 0, data: null, error: "The server could not be reached." };
		}
		if ( res.status === 401 ) {
			onRefused( res.status );
		}
		let data = null;
		try {
			data = await res.json();
		} catch ( e ) {
			data = null;
		}
		const refused = data && data.success === false;
		const ok = res.ok && !refused;
		const error = ok ? "" : ( ( data && ( data.error || data.reason || data.message ) ) || "The server answered " + res.status + "." );
		return { ok, status: res.status, data, error };
	}

	return {
		url,
		/**
		 * @param {string} path A path under the API, with its query
		 * @param {{ signal?: AbortSignal }} [options] Abort when the page leaves
		 * @returns {Promise<object>} { ok, status, data, error }
		 */
		get    : ( path, options ) => call( "GET", path, null, options ),
		/**
		 * @param {string} path A path under the API
		 * @param {object} [body] Sent as JSON
		 * @param {{ signal?: AbortSignal }} [options] Abort when the page leaves
		 * @returns {Promise<object>} { ok, status, data, error }
		 */
		post   : ( path, body, options ) => call( "POST", path, body, options ),
		/** The headers every call sends, for a stream (sse.js) */
		headers: authHeaders
	};
}
