/**
 * Light, dark or the system's. Kept in this browser as "dark", "light" or nothing, under the key the earlier page used,
 * so a choice made there carries over. The layout sets the attribute before the CSS loads (no flash); this keeps it in
 * step afterwards and tells the server.
 *
 * @param {object} api The API client (utils/api.js), to save the choice as a preference
 * @returns {object} The store
 */
export function theme( api ) {
	const KEY = "bxagents_webui_theme";
	return {
		/** @type {string} "light", "dark" or "" (follow the system) */
		mode : "",

		/** @type {boolean} True while the system asks for dark: what "" follows */
		systemDark : false,

		/** @returns {boolean} True when the page is dark now */
		get dark() {
			if ( this.mode ) {
				return this.mode === "dark";
			}
			return this.systemDark;
		},

		/** Reads the stored mode and applies it. */
		init() {
			let stored;
			try {
				stored = localStorage.getItem( KEY ) || "";
			} catch {
				stored = "";
			}
			this.mode = stored === "dark" || stored === "light" ? stored : "";
			const query = window.matchMedia ? window.matchMedia( "(prefers-color-scheme: dark)" ) : null;
			this.systemDark = !!( query && query.matches );
			// following the system: a change there shows at once
			query && query.addEventListener && query.addEventListener( "change", event => {
				this.systemDark = event.matches;
				this.apply();
			} );
			this.apply();
		},

		/** Switches between light and dark. */
		toggle() {
			this.set( this.dark ? "light" : "dark" );
		},

		/**
		 * @param {string} mode "light", "dark" or "system"
		 */
		set( mode ) {
			this.mode = mode === "dark" || mode === "light" ? mode : "";
			try {
				if ( this.mode ) {
					localStorage.setItem( KEY, this.mode );
				} else {
					localStorage.removeItem( KEY );
				}
			} catch {
				// the choice still holds for this visit
			}
			this.apply();
			api.post( "/preferences/set", { key: "theme", value: this.mode || "system" } );
		},

		/**
		 * Writes the look on the root element, where the tokens read it: the chosen mode, or the system's when none is
		 * chosen (the styles only know data-theme, so following the system must set it too).
		 */
		apply() {
			document.documentElement.setAttribute( "data-theme", this.dark ? "dark" : "light" );
		}
	};
}
