/**
 * Short messages the person sees for a moment: "Saved", "Could not connect". One region for the whole app (the
 * _components/ui/toasts partial), announced to screen readers, each message gone after a few seconds.
 *
 * @returns {object} The store
 */
export function toast() {
	let next = 1;
	return {
		/** @type {Array<{ id: number, kind: string, text: string }>} What is showing */
		items : [],

		/**
		 * @param {string} text What to say
		 * @param {string} [kind] "ok", "error" or "info"
		 * @param {number} [ms] How long it stays (errors stay longer)
		 * @returns {number} Its id, for dismiss()
		 */
		show( text, kind = "info", ms ) {
			const id = next++;
			this.items.push( { id, kind, text: String( text || "" ) } );
			setTimeout( () => this.dismiss( id ), ms || ( kind === "error" ? 8000 : 4000 ) );
			return id;
		},

		/** @param {string} text What went well @returns {number} Its id */
		success( text ) {
			return this.show( text, "ok" );
		},

		/** @param {string} text What went wrong @returns {number} Its id */
		error( text ) {
			return this.show( text, "error" );
		},

		/** @param {number} id A message to take away */
		dismiss( id ) {
			this.items = this.items.filter( item => item.id !== id );
		}
	};
}
