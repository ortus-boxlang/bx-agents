/**
 * The frame every page sits in: it starts the session store, so the menu knows what to show.
 *
 * @returns {object} Alpine component state and actions
 */
export function appShell() {
	return {
		/** Loads the capabilities once, when the page starts. */
		init() {
			this.$store.theme.init();
			this.$store.appearance.init();
			this.$store.session.init();
		}
	};
}
