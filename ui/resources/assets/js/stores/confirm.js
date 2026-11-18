/**
 * The one question dialog of the app (the _components/ui/confirm partial): $confirm( { title, body, danger } ) opens it
 * and answers a promise, true or false. Replaces window.confirm, which cannot be styled, read well or tested.
 *
 * @returns {object} The store
 */
export function confirm() {
	let settle = null;
	return {
		/** @type {boolean} True while the dialog is open */
		open  : false,
		title : "",
		body  : "",
		yes   : "OK",
		danger: false,

		/**
		 * @param {{ title: string, body?: string, yes?: string, danger?: boolean }} question What to ask
		 * @returns {Promise<boolean>} True when the person said yes
		 */
		ask( question ) {
			if ( settle ) {
				settle( false );
			}
			this.title = question.title || "Are you sure?";
			this.body = question.body || "";
			this.yes = question.yes || ( question.danger ? "Delete" : "OK" );
			this.danger = !!question.danger;
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
				done( !!answer );
			}
		}
	};
}
