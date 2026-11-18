/**
 * The accent colour, text size and density a person picks, kept in this browser under the same key and shape as the
 * current page ({ accent, size, density }), so both apps share it while both run.
 *
 * @returns {object} The store
 */
import { accentForeground, normalizeHex } from "../utils/color.js";

export const ACCENT_PRESETS = [
	[ "Blue", "#3b5bdb" ], [ "Teal", "#0f9d8a" ], [ "Green", "#2f9e44" ], [ "Amber", "#d9730d" ],
	[ "Red", "#e03131" ], [ "Pink", "#d6336c" ], [ "Violet", "#7048e8" ], [ "Slate", "#475569" ]
];
export const TEXT_SIZES = { small: "0.85rem", medium: "", large: "1.05rem" };
const KEY = "bxagents_webui_appearance";

/**
 * @returns {object} The store
 */
export function appearance() {
	return {
		/** @type {string} "#rrggbb", or "" for the project's own accent */
		accent : "",
		/** @type {string} small, medium or large */
		size   : "medium",
		/** @type {string} comfortable or compact */
		density: "comfortable",
		presets: ACCENT_PRESETS,

		/** Reads what was kept and applies it. */
		init() {
			try {
				const saved = JSON.parse( localStorage.getItem( KEY ) || "{}" );
				this.accent = normalizeHex( saved.accent );
				this.size = Object.prototype.hasOwnProperty.call( TEXT_SIZES, saved.size ) ? saved.size : "medium";
				this.density = saved.density === "compact" ? "compact" : "comfortable";
			} catch ( e ) {
				// nothing kept, or not readable: the defaults
			}
			this.apply();
		},

		/**
		 * @param {{ accent?: string, size?: string, density?: string }} change What to change
		 */
		set( change ) {
			if ( "accent" in change ) {
				this.accent = normalizeHex( change.accent );
			}
			if ( "size" in change && Object.prototype.hasOwnProperty.call( TEXT_SIZES, change.size ) ) {
				this.size = change.size;
			}
			if ( "density" in change ) {
				this.density = change.density === "compact" ? "compact" : "comfortable";
			}
			try {
				localStorage.setItem( KEY, JSON.stringify( { accent: this.accent, size: this.size, density: this.density } ) );
			} catch ( e ) {
				// the choice still holds for this visit
			}
			this.apply();
		},

		/** Back to the project's own look. */
		reset() {
			this.set( { accent: "", size: "medium", density: "comfortable" } );
		},

		/** Writes the choices on the root element, as CSS custom properties and an attribute. */
		apply() {
			const root = document.documentElement;
			if ( this.accent ) {
				root.style.setProperty( "--accent", this.accent );
				root.style.setProperty( "--accent-fg", accentForeground( this.accent ) );
			} else {
				root.style.removeProperty( "--accent" );
				root.style.removeProperty( "--accent-fg" );
			}
			if ( TEXT_SIZES[ this.size ] ) {
				root.style.setProperty( "--font-size", TEXT_SIZES[ this.size ] );
			} else {
				root.style.removeProperty( "--font-size" );
			}
			if ( this.density === "compact" ) {
				root.setAttribute( "data-density", "compact" );
			} else {
				root.removeAttribute( "data-density" );
			}
		}
	};
}
