/**
 * The Gateways page (admin): the chat services the agent talks through (GET /gateways), whether each is connected, its
 * chats, and reconnecting one (POST /gateways/reconnect).
 *
 * @returns {object} Alpine component state and actions
 */
export const GATEWAY_STATES = {
	connected : { kind: "ok", icon: "check-circle", label: "Connected" },
	stopped   : { kind: "", icon: "pause", label: "Stopped" },
	failing   : { kind: "bad", icon: "warning-circle", label: "Failing" },
	missing   : { kind: "warn", icon: "question", label: "Not registered" }
};

/**
 * @param {number} ms A time in milliseconds
 * @returns {string} "2026-11-18 09:30", or "" for none
 */
export function seenText( ms ) {
	return ms ? new Date( ms ).toISOString().replace( "T", " " ).slice( 0, 16 ) : "";
}

/**
 * @returns {object} Alpine component state and actions
 */
export function gatewaysPage() {
	return {
		/** @type {boolean} True until the gateways answered */
		loading      : true,
		/** @type {string} Why they could not be read */
		failed       : "",
		/** @type {Array<object>} The gateways */
		gateways     : [],
		/** @type {string} The gateway being reconnected */
		reconnecting : "",

		/** Loads the gateways. */
		init() {
			this.load();
		},

		/** Reads the gateways. */
		async load() {
			const result = await this.$api.get( "/gateways" );
			this.loading = false;
			if ( !result.ok ) {
				this.failed = "Could not load the gateways.";
				return;
			}
			this.failed = "";
			this.gateways = result.data.gateways || [];
		},

		/**
		 * @param {{ state: string }} gateway A gateway
		 * @returns {{ kind: string, icon: string, label: string }} Its state chip
		 */
		state( gateway ) {
			return GATEWAY_STATES[ gateway.state ] || { kind: "", icon: "question", label: gateway.state };
		},

		/**
		 * @param {{ credentials?: Array<{ env: string, set: boolean }> }} gateway A gateway
		 * @returns {string} Which credentials it needs and whether each is set
		 */
		credentialsText( gateway ) {
			const creds = gateway.credentials || [];
			return creds.length ? creds.map( c => c.env + ": " + ( c.set ? "set" : "NOT SET" ) ).join( ", " ) : "No credentials to set.";
		},

		/**
		 * @param {{ type: string }} gateway A gateway
		 * @returns {string} The address of its log, searched for its type
		 */
		logUrl( gateway ) {
			return this.$store.session.config.basePath + "/logs/gateways?q=" + encodeURIComponent( gateway.type || "" );
		},

		/** Shown under the time a chat was last seen */
		seenText,

		/**
		 * Starts a gateway again.
		 *
		 * @param {{ name: string }} gateway The gateway
		 */
		async reconnect( gateway ) {
			this.reconnecting = gateway.name;
			const result = await this.$api.post( "/gateways/reconnect", { name: gateway.name } );
			this.reconnecting = "";
			await this.load();
			if ( result.ok ) {
				this.$toast.success( "Reconnected " + gateway.name + "." );
			} else {
				this.$toast.error( result.error || "Could not reconnect " + gateway.name + "." );
			}
		}
	};
}
