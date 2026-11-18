/**
 * Colour helpers for the accent a person picks: a valid #rrggbb, and the text colour that reads on it.
 */

/**
 * @param {string} hex #rrggbb
 * @returns {number} Its WCAG relative luminance
 */
export function luminance( hex ) {
	const channels = [ 1, 3, 5 ].map( at => {
		const c = parseInt( hex.substr( at, 2 ), 16 ) / 255;
		return c <= 0.03928 ? c / 12.92 : Math.pow( ( c + 0.055 ) / 1.055, 2.4 );
	} );
	return 0.2126 * channels[ 0 ] + 0.7152 * channels[ 1 ] + 0.0722 * channels[ 2 ];
}

/**
 * @param {string} a #rrggbb
 * @param {string} b #rrggbb
 * @returns {number} Their contrast ratio, 1 to 21
 */
export function contrastRatio( a, b ) {
	const hi = Math.max( luminance( a ), luminance( b ) );
	const lo = Math.min( luminance( a ), luminance( b ) );
	return ( hi + 0.05 ) / ( lo + 0.05 );
}

/**
 * @param {string} accent #rrggbb
 * @returns {string} White, or near black when that reads better on the accent
 */
export function accentForeground( accent ) {
	return contrastRatio( accent, "#ffffff" ) >= contrastRatio( accent, "#101828" ) ? "#ffffff" : "#101828";
}

/**
 * @param {string} value A colour as typed: "#3b5bdb", "3b5bdb", "#abc"
 * @returns {string} "#rrggbb" in lower case, or "" when it is not a colour
 */
export function normalizeHex( value ) {
	let v = String( value || "" ).trim().replace( /^#/, "" );
	if ( /^[0-9a-f]{3}$/i.test( v ) ) {
		v = v.replace( /(.)/g, "$1$1" );
	}
	return /^[0-9a-f]{6}$/i.test( v ) ? "#" + v.toLowerCase() : "";
}
