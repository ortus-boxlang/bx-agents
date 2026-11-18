/**
 * Server-sent events over fetch, so a stream can be a POST with a JSON body (EventSource can only GET). The agent API's
 * turns stream this way: POST /stream, /events and /resume answer `event: <name>` and `data: <json>` frames.
 */

/**
 * Splits the text of a stream into events. Frames end with a blank line; a `data:` field may span lines; lines that
 * start with `:` are comments (keep-alives).
 *
 * @param {string} buffer What has arrived and not been read yet
 * @returns {{ events: Array<{ event: string, data: string }>, rest: string }} The whole events, and what is left
 */
export function parseFrames( buffer ) {
	const events = [];
	const normalized = buffer.replace( /\r\n/g, "\n" );
	const frames = normalized.split( "\n\n" );
	const rest = frames.pop();
	for ( const frame of frames ) {
		let event = "message";
		const data = [];
		for ( const line of frame.split( "\n" ) ) {
			if ( !line || line.startsWith( ":" ) ) {
				continue;
			}
			const at = line.indexOf( ":" );
			const field = at === -1 ? line : line.slice( 0, at );
			const value = at === -1 ? "" : line.slice( at + 1 ).replace( /^ /, "" );
			if ( field === "event" ) {
				event = value;
			} else if ( field === "data" ) {
				data.push( value );
			}
		}
		if ( data.length || event !== "message" ) {
			events.push( { event, data: data.join( "\n" ) } );
		}
	}
	return { events, rest };
}

/**
 * Opens a stream and calls onEvent for each event, with its data parsed as JSON when it is JSON.
 *
 * @param {string} url The address
 * @param {{ body?: object, headers?: object, signal?: AbortSignal, onEvent: Function, fetchImpl?: typeof fetch }} options What to send and who to tell
 * @returns {Promise<{ ok: boolean, status: number, error: string }>} Settles when the stream ends, fails or is aborted
 */
export async function streamEvents( url, options ) {
	const fetchImpl = options.fetchImpl || ( ( ...args ) => fetch( ...args ) );
	let res;
	try {
		res = await fetchImpl( url, {
			method : options.body ? "POST" : "GET",
			headers: { Accept: "text/event-stream", ...( options.body ? { "Content-Type": "application/json" } : {} ), ...( options.headers || {} ) },
			body   : options.body ? JSON.stringify( options.body ) : undefined,
			signal : options.signal
		} );
	} catch ( e ) {
		return { ok: false, status: 0, error: e && e.name === "AbortError" ? "" : "The server could not be reached." };
	}
	if ( !res.ok || !res.body ) {
		let error = "The server answered " + res.status + ".";
		try {
			const payload = await res.json();
			error = payload.error || payload.reason || error;
		} catch ( e ) {
			// not JSON: keep the status
		}
		return { ok: false, status: res.status, error };
	}
	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	try {
		for ( ;; ) {
			const { value, done } = await reader.read();
			if ( done ) {
				break;
			}
			buffer += decoder.decode( value, { stream: true } );
			const parsed = parseFrames( buffer );
			buffer = parsed.rest;
			parsed.events.forEach( e => options.onEvent( e.event, parseData( e.data ) ) );
		}
		const last = parseFrames( buffer + "\n\n" );
		last.events.forEach( e => options.onEvent( e.event, parseData( e.data ) ) );
	} catch ( e ) {
		return { ok: false, status: res.status, error: e && e.name === "AbortError" ? "" : "The stream was cut off." };
	}
	return { ok: true, status: res.status, error: "" };
}

/**
 * @param {string} data The data of an event
 * @returns {any} It parsed as JSON, or the text itself
 */
function parseData( data ) {
	try {
		return JSON.parse( data );
	} catch ( e ) {
		return data;
	}
}
