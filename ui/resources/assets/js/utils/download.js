/**
 * Saves a file the agent API answers (a backup, an exported conversation). The API needs the page's headers, so this
 * is a fetch and a temporary link, not a plain <a href>.
 *
 * @param {{ url: Function, headers: Function }} api The API client (utils/api.js)
 * @param {string} path A path under the API, with its query
 * @param {string} filename The name to save it as
 * @returns {Promise<boolean>} True when the file was handed to the browser
 */
export async function downloadFile( api, path, filename ) {
	try {
		const res = await fetch( api.url( path ), { headers: api.headers() } );
		if ( !res.ok ) {
			return false;
		}
		const url = URL.createObjectURL( await res.blob() );
		const link = document.createElement( "a" );
		link.href = url;
		link.download = filename;
		document.body.appendChild( link );
		link.click();
		link.remove();
		setTimeout( () => URL.revokeObjectURL( url ), 1000 );
		return true;
	} catch {
		return false;
	}
}

/**
 * @param {string} title A conversation's title
 * @returns {string} A file name made of it: "Plan-the-launch.md"
 */
export function markdownName( title ) {
	return ( title || "conversation" ).replace( /[^A-Za-z0-9._-]+/g, "-" ).slice( 0, 60 ) + ".md";
}
