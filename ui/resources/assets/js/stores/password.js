import { saveKey, savedKey } from "../utils/api.js";

/**
 * The password (API key) of an agent that has no accounts. It is kept in this browser under the same key as the current
 * page and sent with every call (utils/api.js). The dialog opens by itself when the server refuses a call, but only once
 * per page load, so a wrong password does not bring it back after every request; the Password button opens it any time.
 *
 * @returns {object} The store
 */
export function password() {
	return {
		/** @type {boolean} True while the dialog is open */
		open    : false,
		/** @type {string} What to say above the box, after a refusal */
		problem : "",
		/** @type {string} What is typed */
		value   : "",
		/** @type {boolean} True once the dialog opened by itself */
		asked   : false,

		/** @returns {boolean} True when this browser keeps a password */
		get saved() {
			return !!savedKey();
		},

		/**
		 * Opens the dialog.
		 *
		 * @param {string} [problem] Why, when the server refused a call
		 */
		ask( problem ) {
			if ( this.open || ( problem !== undefined && this.asked ) ) {
				return;
			}
			this.asked = this.asked || problem !== undefined;
			this.problem = problem || "";
			this.value = "";
			this.open = true;
		},

		/** Keeps what was typed and loads the page again with it. */
		save() {
			saveKey( this.value.trim() );
			this.value = "";
			this.open = false;
			window.location.reload();
		},

		/** Forgets the password kept in this browser. */
		forget() {
			saveKey( "" );
			this.open = false;
			window.location.reload();
		}
	};
}
