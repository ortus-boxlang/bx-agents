/**
 * The /_kit page: every partial and every magic of the web app in one place, to look at and to test against.
 *
 * @returns {object} Alpine component state and actions
 */
export function kitPage() {
	return {
		/** @type {string} What the last question was answered */
		answer   : "",
		/** @type {string} The tab that is open in the tabs example */
		tab      : "one",
		/** @type {boolean} The switch example */
		on       : true,
		/** @type {boolean} True while the modal example is open */
		modal    : false,
		/** @type {boolean} True while the drawer example is open */
		drawer   : false,
		/** @type {string} The search example */
		query    : "",
		/** @type {string} Markdown with markup that must not run */
		markdown : "**Bold**, a [link](https://example.com) and <img src=x onerror=\"window.__kitXss=1\">",

		/** Asks a question with $confirm and keeps the answer. */
		async ask() {
			const yes = await this.$confirm( { title: "Delete this?", body: "It cannot be undone.", danger: true } );
			this.answer = yes ? "yes" : "no";
		}
	};
}
