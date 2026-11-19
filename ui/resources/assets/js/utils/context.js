/**
 * The context gauge of the chat: how much of the model's window the open conversation uses (GET /context answers
 * { total, contextWindow, percent, parts: [ { label, detail, tokens } ], tools: [ { name, tokens } ] }).
 */

/**
 * @param {number} n Tokens
 * @returns {string} "~850", "~12.3k"
 */
export function approx( n ) {
	return "~" + ( n < 1000 ? n : ( n / 1000 ).toFixed( 1 ).replace( /\.0$/, "" ) + "k" );
}

/**
 * @param {number} n The model's window, in tokens
 * @returns {string} "128k", "1M"
 */
export function windowText( n ) {
	return n >= 1000000 && n % 100000 === 0 ? n / 1000000 + "M" : n >= 1000 ? Math.round( n / 1000 ) + "k" : String( n );
}

/**
 * @param {{ contextWindow: number, percent: number }} report What GET /context answered
 * @returns {string} "ok", "warn" at 70 percent, "danger" at 90, "unknown" when the window is not known
 */
export function contextLevel( report ) {
	if ( !( report.contextWindow > 0 ) ) {
		return "unknown";
	}
	return report.percent >= 90 ? "danger" : report.percent >= 70 ? "warn" : "ok";
}

/**
 * @param {{ total: number, contextWindow: number, percent: number }} report What GET /context answered
 * @returns {string} "~1.2k of 128k tokens (1%)"
 */
export function contextSummary( report ) {
	return report.contextWindow > 0
		? approx( report.total ) + " of " + windowText( report.contextWindow ) + " tokens (" + report.percent + "%)"
		: approx( report.total ) + " tokens (this model's window is not known)";
}

/**
 * @param {{ contextWindow: number, percent: number }} report What GET /context answered
 * @returns {string} The ring's stroke-dasharray: the share of the window used, out of 100
 */
export function ringDash( report ) {
	return ( contextLevel( report ) === "unknown" ? 0 : Math.max( 2, Math.min( 100, report.percent ) ) ) + " 100";
}
