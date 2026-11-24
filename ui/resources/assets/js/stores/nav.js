/** The widest screen, in rem, on which the menu and the conversations are drawers (the phone breakpoint of the Sass) */
const NARROW = "(max-width: 40rem)";

/** What each drawer is, and the first thing in it to focus: the menu and the list of conversations */
const DRAWERS = { nav: "#mainNav", conversations: "#sidebar" };

/** The things inside a drawer that take the focus */
const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";

/**
 * The left menu: folded to icons or open (kept in this browser), and, on a narrow screen, the one drawer that is open:
 * the menu or the list of conversations. Both are drawers under 40rem and plain columns above it.
 *
 * @param {import("alpinejs").Alpine} Alpine Alpine, for $persist and nextTick
 * @returns {object} The store
 */
export function nav( Alpine ) {
	return {
		/** @type {boolean} True when the menu shows icons only */
		folded : Alpine.$persist( false ).as( "bxagents.nav.folded" ),
		/** @type {string} The drawer that is open: "nav", "conversations" or "" (none). Shown as data-drawer on the body. */
		drawer : "",
		/** @type {boolean} True while the screen is narrow enough for drawers */
		narrow : false,
		/** @type {HTMLElement|null} The button that opened the drawer, which gets the focus back */
		opener : null,

		/** Follows the screen width: a drawer left open by a rotation or a resize to a wide screen is closed. */
		init() {
			if ( typeof window.matchMedia !== "function" ) {
				return;
			}
			const query = window.matchMedia( NARROW );
			this.narrow = query.matches;
			query.addEventListener( "change", event => {
				this.narrow = event.matches;
				if ( !event.matches ) {
					this.drawer = "";
					this.opener = null;
				}
			} );
		},

		/** Folds the menu to icons, or opens it again. */
		toggleFold() {
			this.folded = !this.folded;
		},

		/**
		 * @param {string} name "nav" or "conversations"
		 * @returns {boolean} True when that drawer is open
		 */
		isOpen( name ) {
			return this.drawer === name;
		},

		/**
		 * @param {string} name "nav" or "conversations"
		 * @returns {boolean} True when that drawer is shut on a narrow screen, so it is out of reach (inert)
		 */
		shut( name ) {
			return this.narrow && this.drawer !== name;
		},

		/**
		 * Opens a drawer, or closes it when it is the one open. Opening moves the focus into it.
		 *
		 * @param {string} name "nav" or "conversations"
		 * @param {HTMLElement} [opener] The button, to give the focus back to
		 */
		toggle( name, opener ) {
			if ( this.drawer === name ) {
				this.close();
				return;
			}
			this.drawer = name;
			this.opener = opener || null;
			Alpine.nextTick( () => {
				const first = document.querySelector( DRAWERS[ name ] ).querySelector( FOCUSABLE );
				first && first.focus();
			} );
		},

		/** Closes the open drawer. The focus goes back to the button that opened it, if it was inside the drawer. */
		close() {
			const drawer = DRAWERS[ this.drawer ] && document.querySelector( DRAWERS[ this.drawer ] );
			const inside = drawer && drawer.contains( document.activeElement );
			const opener = this.opener;
			this.drawer = "";
			this.opener = null;
			if ( opener && ( inside || document.activeElement === document.body ) ) {
				opener.focus();
			}
		},

		/**
		 * Keys while a drawer is open: Escape closes it, and Tab stays inside it.
		 *
		 * @param {KeyboardEvent} event The keydown
		 */
		onKey( event ) {
			if ( !this.drawer ) {
				return;
			}
			if ( event.key === "Escape" ) {
				this.close();
				return;
			}
			if ( event.key !== "Tab" ) {
				return;
			}
			const stops = [ ...document.querySelector( DRAWERS[ this.drawer ] ).querySelectorAll( FOCUSABLE ) ].filter( el => el.offsetParent !== null );
			if ( !stops.length ) {
				return;
			}
			const first = stops[ 0 ];
			const last = stops[ stops.length - 1 ];
			const outside = !stops.includes( document.activeElement );
			if ( event.shiftKey && ( outside || document.activeElement === first ) ) {
				event.preventDefault();
				last.focus();
			} else if ( !event.shiftKey && ( outside || document.activeElement === last ) ) {
				event.preventDefault();
				first.focus();
			}
		}
	};
}
