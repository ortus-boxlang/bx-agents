/**
 * One answer of the agent as plain data, built from the frames of POST /stream: the words, the reasoning, and each tool
 * call with its arguments as they arrive. The chat draws it; nothing here touches the page, so it is tested on its own.
 *
 * Each frame is a bx-ai chunk forwarded as is: { choices: [ { delta: { content, reasoning, tool_calls } } ] }, then
 * "[DONE]". A paused tool call (an approval) arrives as { type: "middleware_stop" }.
 */

/**
 * @returns {{ text: string, reasoning: string, tools: Array<{ index: number, name: string, args: string, done: boolean }>,
 *            pending: boolean, suspended: boolean, done: boolean }} An empty answer
 */
export function newTurn() {
	return { text: "", reasoning: "", tools: [], pending: true, suspended: false, done: false };
}

/**
 * Folds one frame of the stream into the answer.
 *
 * @param {object} turn The answer (changed in place)
 * @param {any} data The frame's data, parsed
 * @returns {object} The answer
 */
export function applyFrame( turn, data ) {
	if ( data === "[DONE]" ) {
		turn.done = true;
		return turn;
	}
	if ( !data || typeof data !== "object" ) {
		return turn;
	}
	if ( data.type === "middleware_stop" ) {
		turn.suspended = true;
		return turn;
	}
	const choice = data.choices && data.choices[ 0 ];
	const delta = choice && choice.delta;
	if ( !delta ) {
		return turn;
	}
	if ( typeof delta.content === "string" && delta.content ) {
		turn.text += delta.content;
	}
	if ( typeof delta.reasoning === "string" && delta.reasoning ) {
		turn.reasoning += delta.reasoning;
	}
	if ( Array.isArray( delta.tool_calls ) ) {
		delta.tool_calls.forEach( ( call, position ) => {
			const fn = call.function || {};
			const index = typeof call.index === "number" ? call.index : position;
			let tool = turn.tools.find( t => t.index === index );
			if ( !tool ) {
				tool = { index, name: "", args: "", done: false };
				turn.tools.push( tool );
			}
			if ( fn.name ) {
				tool.name = fn.name;
			}
			if ( fn.arguments ) {
				tool.args += fn.arguments;
			}
		} );
	}
	return turn;
}

/**
 * Marks an answer finished: its tools done, and "(no response)" when nothing came.
 *
 * @param {object} turn The answer (changed in place)
 * @returns {object} The answer
 */
export function settleTurn( turn ) {
	turn.pending = false;
	turn.tools.forEach( t => {
		t.done = true;
	} );
	if ( !turn.text && !turn.suspended ) {
		turn.empty = true;
	}
	return turn;
}

/**
 * @param {string} args A tool call's arguments as they have arrived
 * @returns {string} The first 60 characters, for the line that stays visible
 */
export function argsPreview( args ) {
	return args.length > 60 ? args.slice( 0, 60 ) + "…" : args;
}

/**
 * @returns {string} A new thread id for one turn
 */
export function newThreadId() {
	return window.crypto && window.crypto.randomUUID
		? window.crypto.randomUUID()
		: "t-" + Date.now() + "-" + Math.random().toString( 36 ).slice( 2, 10 );
}
