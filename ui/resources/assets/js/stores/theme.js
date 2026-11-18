/**
 * Light or dark, kept in this browser under the same key the old page used, so a choice carries over.
 * The layout sets the attribute before the CSS loads (no flash); this keeps it in step afterwards.
 *
 * @param {import("alpinejs").Alpine} Alpine Alpine, for $persist
 * @returns {object} The store
 */
export function theme( Alpine ) {
	return {
		/** @type {string} "light", "dark" or "" (follow the system) */
		mode: Alpine.$persist( "" ).as( "bxagents_webui_theme" ),

		/** @returns {boolean} True when the page is dark now */
		get dark() {
			if ( this.mode ) {
				return this.mode === "dark";
			}
			return !!( window.matchMedia && window.matchMedia( "(prefers-color-scheme: dark)" ).matches );
		},

		/** Applies the mode to the page. */
		init() {
			this.apply();
		},

		/** Switches between light and dark. */
		toggle() {
			this.mode = this.dark ? "light" : "dark";
			this.apply();
		},

		/** Writes the mode on the root element, where the tokens read it. */
		apply() {
			if ( this.mode ) {
				document.documentElement.setAttribute( "data-theme", this.mode );
			} else {
				document.documentElement.removeAttribute( "data-theme" );
			}
		}
	};
}
