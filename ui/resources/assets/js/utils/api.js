/**
 * The one way the web app talks to the agent API: every call answers { ok, status, data, error } and never throws for an
 * HTTP error, so a page has one shape to handle. It sends the headers the API asks of a page (who is calling, and that a
 * script of the page made the request, which a form from another site cannot do).
 */

const HEADERS = { "x-bxagents-source": "web", "x-bxagents-csrf": "1" };

/**
 * @param {string} apiBase Where the agent API is (/__bxagents)
 * @param {typeof fetch} [fetchImpl] The fetch to use (a test passes its own)
 * @returns {{ get: Function, post: Function, url: Function }} The client
 */
export function createApi( apiBase, fetchImpl = ( ...args ) => fetch( ...args ) ) {
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
		const init = { method, headers: { ...HEADERS }, signal: options.signal };
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
		headers: () => ( { ...HEADERS } )
	};
}
