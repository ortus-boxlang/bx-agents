/**
 * Keeps what a page shows (a tab, a filter) in the address without a reload, so a reload or a shared link opens the
 * same view.
 *
 * @param {string} path The path, under the app's base path: "/registry/skills"
 * @param {Object<string, string>} [query] Query values; empty ones are left out
 */
export function keepInAddress( path, query = {} ) {
	const params = new URLSearchParams();
	Object.keys( query ).forEach( key => {
		if ( query[ key ] !== "" && query[ key ] !== null && query[ key ] !== undefined ) {
			params.set( key, query[ key ] );
		}
	} );
	const search = params.toString();
	history.replaceState( null, "", path + ( search ? "?" + search : "" ) );
}

/**
 * @param {string} text A comma separated list as typed: "api.github.com, , uploads.github.com"
 * @returns {string[]} Its items, trimmed, without empty ones
 */
export function listOf( text ) {
	return String( text || "" ).split( "," ).map( x => x.trim() ).filter( Boolean );
}
