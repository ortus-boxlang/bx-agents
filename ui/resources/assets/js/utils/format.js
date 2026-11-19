/**
 * How dates, sizes and counts read in the web app. Shared, so every page says them the same way.
 */

/**
 * @param {string} stamp An ISO date and time (2026-11-18T09:30:00)
 * @returns {string} "2026-11-18 09:30", or "" for nothing
 */
export function stampText( stamp ) {
	return stamp ? String( stamp ).replace( "T", " " ).slice( 0, 16 ) : "";
}

/**
 * @param {string} stamp An ISO date
 * @returns {string} "2026-11-18", or "" for nothing
 */
export function dayText( stamp ) {
	return stamp ? String( stamp ).slice( 0, 10 ) : "";
}

/**
 * @param {number} bytes A size
 * @returns {string} "512 B", "3.4 KB", "1.2 MB"
 */
export function bytesText( bytes ) {
	const n = Number( bytes ) || 0;
	if ( n < 1024 ) {
		return n + " B";
	}
	const units = [
		"KB",
		"MB",
		"GB",
		"TB"
	];
	let value = n / 1024;
	let unit = 0;
	while ( value >= 1024 && unit < units.length - 1 ) {
		value /= 1024;
		unit++;
	}
	return ( value >= 10 ? Math.round( value ) : Math.round( value * 10 ) / 10 ) + " " + units[ unit ];
}

/**
 * @param {number} count How many
 * @param {string} one The word for one
 * @param {string} [many] The word for more (one + "s" when left out)
 * @returns {string} "1 tool", "3 tools", "no tools"
 */
export function countLabel( count, one, many ) {
	const plural = many || one + "s";
	if ( !count ) {
		return "no " + plural;
	}
	return count + " " + ( count === 1 ? one : plural );
}
