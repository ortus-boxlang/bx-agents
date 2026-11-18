/**
 * The left menu: folded to icons or open (kept in this browser), and open as a drawer on a phone.
 *
 * @param {import("alpinejs").Alpine} Alpine Alpine, for $persist
 * @returns {object} The store
 */
export function nav( Alpine ) {
	return {
		/** @type {boolean} True when the menu shows icons only */
		folded: Alpine.$persist( false ).as( "bxagents.nav.folded" ),
		/** @type {boolean} True while the drawer is open on a narrow screen */
		open  : false,

		/** Folds the menu to icons, or opens it again. */
		toggleFold() {
			this.folded = !this.folded;
		},

		/** Opens or closes the drawer on a narrow screen. */
		toggleDrawer() {
			this.open = !this.open;
		}
	};
}
