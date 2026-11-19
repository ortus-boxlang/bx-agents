/**
 * Who is signed in and what the agent offers them: the capabilities the agent API answers at GET /agent.
 *
 * @param {object} config What readConfig() answered
 * @returns {object} The store
 */
export function session( config ) {
	return {
		config,
		/** @type {boolean} True once /agent has answered */
		ready       : false,
		/** @type {object} The capabilities, as GET /agent answers them: { admin, notes, vault, logs, ... } */
		capabilities: {},
		/** @type {string} The agent's name */
		agentName   : "",
		/** @type {Array<{ name: string, parent?: string }>} The agent and its sub-agents, as GET /agent answers them */
		agents      : [],
		/** @type {string} Whether the model sees pictures: "yes", "no", or "" when not known */
		vision      : "",

		/** @type {Promise<void>|null} Settles once the capabilities are known; see loaded() */
		pending: null,

		/**
		 * Asks the agent API what this person may use, once.
		 *
		 * @returns {Promise<void>} Settles when the capabilities are known (or could not be read: then nothing is offered)
		 */
		init() {
			if ( !this.pending ) {
				this.pending = this.fetchCapabilities();
			}
			return this.pending;
		},

		/**
		 * For a page that decides what to load by a capability: waits until they are known.
		 *
		 * @returns {Promise<void>} Settles when the capabilities are known
		 */
		loaded() {
			return this.init();
		},

		/**
		 * @returns {Promise<void>} Settles when GET /agent answered or failed
		 */
		async fetchCapabilities() {
			try {
				const res = await fetch( config.apiBase + "/agent", { headers: { "x-bxagents-source": "web", "x-bxagents-csrf": "1" } } );
				if ( res.ok ) {
					const payload = await res.json();
					this.capabilities = payload.capabilities || {};
					this.agentName = payload.name || "";
					this.agents = payload.agents || [];
					this.vision = payload.vision || "";
				}
			} catch ( e ) {
				// the menu then shows only what needs no capability
			}
			this.ready = true;
		},

		/**
		 * @param {string} capability "" for a page everybody has, a name ("vault"), either of two ("tokens|admin"), or
		 *        "~name" for "unless the agent says false" (conversations)
		 * @returns {boolean} True when the person may use it
		 */
		can( capability ) {
			if ( !capability ) {
				return true;
			}
			return capability.split( "|" ).some( c => c.startsWith( "~" ) ? this.capabilities[ c.slice( 1 ) ] !== false : !!this.capabilities[ c ] );
		},

		/**
		 * @param {string} capabilities Capabilities as can() takes them, separated by spaces
		 * @returns {boolean} True when the person may use at least one (a menu group shows when one of its pages does)
		 */
		canAny( capabilities ) {
			return String( capabilities || "" ).split( " " ).some( c => this.can( c ) );
		}
	};
}
