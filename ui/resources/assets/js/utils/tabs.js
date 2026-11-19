/**
 * The keys of a row of tabs (the WAI-ARIA tabs pattern, automatic activation): Left and Right move to the tab before and
 * after (round the ends), Home and End to the first and last. The tab moved to gets the focus and is clicked, so it opens.
 */

/** The keys a tab row answers, and where each one goes */
const MOVES = {
	ArrowLeft  : ( at, count ) => ( at - 1 + count ) % count,
	ArrowRight : ( at, count ) => ( at + 1 ) % count,
	Home       : () => 0,
	End        : ( at, count ) => count - 1
};

/**
 * @param {string} key The key pressed
 * @param {number} at The index of the focused tab
 * @param {number} count How many tabs the row has
 * @returns {number} The index to move to, or -1 for a key a tab row does not answer
 */
export function nextTab( key, at, count ) {
	const move = MOVES[ key ];
	return move && count > 0 ? move( at, count ) : -1;
}

/**
 * Moves the focus along a tab row and opens the tab it lands on.
 *
 * @param {KeyboardEvent} event A keydown on a tab
 */
export function moveTab( event ) {
	const row = event.currentTarget.closest( "[role='tablist']" );
	if ( !row ) {
		return;
	}
	const tabs = [ ...row.querySelectorAll( "[role='tab']" ) ];
	const to = nextTab( event.key, tabs.indexOf( event.currentTarget ), tabs.length );
	if ( to === -1 ) {
		return;
	}
	event.preventDefault();
	tabs[ to ].focus();
	tabs[ to ].click();
}
