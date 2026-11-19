/**
 * The one question dialog of the app (the _components/ui/confirm partial). $confirm( { title, body, danger } ) answers
 * true or false; $prompt( { title, label, value } ) asks for a line of text and answers it, or null on Cancel. They
 * replace window.confirm and window.prompt, which cannot be styled, read well or tested.
 *
 * @returns {object} The store
 */
export function confirm() {
	let settle = null;
	return {
		/** @type {boolean} True while the dialog is open */
		open   : false,
		title  : "",
		body   : "",
		yes    : "OK",
		danger : false,
		/** @type {boolean} True when the dialog asks for text ($prompt) */
		input  : false,
		/** @type {string} The label of the text box */
		label  : "",
		/** @type {string} The text typed */
		value  : "",

		/**
		 * @param {{ title: string, body?: string, yes?: string, danger?: boolean }} question What to ask
		 * @returns {Promise<boolean>} True when the person said yes
		 */
		ask( question ) {
			return this.show( question, false ).then( answer => answer !== null );
		},

		/**
		 * @param {{ title: string, body?: string, label?: string, value?: string, yes?: string }} question What to ask
		 * @returns {Promise<string|null>} The text typed, or null when the person cancelled
		 */
		prompt( question ) {
			return this.show( question, true );
		},

		/**
		 * Opens the dialog for a question.
		 *
		 * @param {object} question What to ask
		 * @param {boolean} input True to ask for text
		 * @returns {Promise<string|null>} The text (or "" for a yes without text), or null for a no
		 */
		show( question, input ) {
			if ( settle ) {
				settle( null );
			}
			this.title = question.title || "Are you sure?";
			this.body = question.body || "";
			this.yes = question.yes || ( question.danger ? "Delete" : "OK" );
			this.danger = !!question.danger;
			this.input = input;
			this.label = question.label || "";
			this.value = question.value || "";
			this.open = true;
			return new Promise( resolve => {
				settle = resolve;
			} );
		},

		/** @param {boolean} answer The person's answer: closes the dialog and settles the promise */
		answer( answer ) {
			this.open = false;
			if ( settle ) {
				const done = settle;
				settle = null;
				done( answer ? ( this.input ? this.value : "" ) : null );
			}
		}
	};
}
