import { listOf } from "../../utils/address.js";

/**
 * The Vault page: secrets the agent can use (GET /vault; POST /vault, /vault/update, /vault/remove), and for an admin
 * who used them (GET /vault/activity). A value is typed once, sent, and cleared from the page at once; it never comes
 * back. When the agent asked for a secret, the ask comes from the address (data-ask, data-scope, data-why).
 */
export const KEY_SOURCES = {
	env : "set in the environment (BXAGENTS_VAULT_KEY)",
	file: "a file beside the database",
	none: "not set yet: it is made when the first secret is saved"
};

/**
 * @returns {object} Alpine component state and actions
 */
export function vaultPage() {
	return {
		/** @type {string} user | agent: whose secrets are shown */
		scope    : "user",
		/** @type {boolean} True until the vault answered */
		loading  : true,
		/** @type {string} Why the vault could not be read */
		failed   : "",
		/** @type {Array<object>} Every secret this person may see */
		secrets  : [],
		/** @type {boolean} True when this person may change the agent's secrets */
		admin    : false,
		/** @type {string} Where the key is kept */
		keySource: "",
		/** @type {{ name: string, scope: string, why: string } | null} What the agent asked for */
		ask      : null,
		/** @type {{ name: string, value: string, description: string, hosts: string }} The new secret form */
		form     : { name: "", value: "", description: "", hosts: "" },
		/** @type {{ name: string, value: string, description: string, hosts: string } | null} The secret being edited */
		editing  : null,
		/** @type {object|null} The key's state and the recent use of secrets (admin) */
		activity : null,

		/** @returns {Array<object>} The secrets of the open scope */
		get rows() {
			return this.secrets.filter( s => s.scope === this.scope );
		},

		/** @returns {boolean} True when this person may change the secrets of the open scope */
		get canWrite() {
			return this.scope === "user" || this.admin;
		},

		/** Reads the ask from the address, then the vault and, for an admin, its activity. */
		async init() {
			const name = this.$el.dataset.ask;
			if ( name ) {
				this.ask = { name, scope: this.$el.dataset.scope === "agent" ? "agent" : "user", why: this.$el.dataset.why || "" };
				this.scope = this.ask.scope;
				this.form.name = name;
			}
			await this.load();
			await this.$store.session.loaded();
			if ( this.$store.session.can( "admin" ) ) {
				this.loadActivity();
			}
		},

		/** Reads the secrets. */
		async load() {
			const result = await this.$api.get( "/vault" );
			this.loading = false;
			if ( !result.ok ) {
				this.failed = "Could not load the vault.";
				return;
			}
			this.failed = "";
			this.secrets = result.data.secrets || [];
			this.admin = !!result.data.admin;
			this.keySource = ( result.data.status || {} ).keySource || "";
			if ( this.ask && this.ask.scope === "agent" && !this.admin ) {
				this.scope = "user";
				this.$toast.error( "The agent asked for a shared secret. Only an admin can add it." );
			}
		},

		/**
		 * @param {{ description?: string, hosts?: string[], lastUsedAt?: string }} secret A secret
		 * @returns {string} "What it is for · api.github.com · used 2026-11-18"
		 */
		about( secret ) {
			return ( secret.description ? secret.description + " · " : "" )
				+ ( ( secret.hosts || [] ).length ? secret.hosts.join( ", " ) : "any host" ) + " · "
				+ ( secret.lastUsedAt ? "used " + this.$fmt.dayText( secret.lastUsedAt ) : "never used" );
		},

		/** Adds the secret in the form. The value leaves the page with the request. */
		async add() {
			const body = { scope: this.scope, name: this.form.name.trim(), value: this.form.value, description: this.form.description.trim(), hosts: listOf( this.form.hosts ) };
			this.form.value = "";
			const result = await this.$api.post( "/vault", body );
			if ( !result.ok ) {
				this.$toast.error( result.error || "Could not save the secret." );
				return;
			}
			const answered = this.ask && this.ask.name === body.name;
			this.ask = null;
			this.form = { name: "", value: "", description: "", hosts: "" };
			this.$toast.success( answered ? body.name + " saved. Tell the agent to carry on." : "Saved " + body.name + ". It cannot be shown again." );
			await this.load();
		},

		/**
		 * Opens the edit form on a secret.
		 *
		 * @param {{ name: string, description?: string, hosts?: string[] }} secret The secret
		 */
		edit( secret ) {
			this.editing = { name: secret.name, value: "", description: secret.description || "", hosts: ( secret.hosts || [] ).join( ", " ) };
		},

		/** Saves the edit form. An empty value keeps the current one. */
		async save() {
			const changes = { scope: this.scope, name: this.editing.name, description: this.editing.description.trim(), hosts: listOf( this.editing.hosts ) };
			if ( this.editing.value ) {
				changes.value = this.editing.value;
			}
			this.editing.value = "";
			const result = await this.$api.post( "/vault/update", changes );
			if ( !result.ok ) {
				this.$toast.error( result.error || "Could not save the secret." );
				return;
			}
			this.editing = null;
			this.$toast.success( "Saved." );
			await this.load();
		},

		/**
		 * Removes a secret, once the person agrees.
		 *
		 * @param {{ name: string }} secret The secret
		 */
		async remove( secret ) {
			const yes = await this.$confirm( { title: "Remove " + secret.name + "?", body: "Anything that uses it will stop working.", yes: "Remove", danger: true } );
			if ( !yes ) {
				return;
			}
			const result = await this.$api.post( "/vault/remove", { scope: this.scope, name: secret.name } );
			if ( result.ok ) {
				this.$toast.success( "Removed " + secret.name + "." );
			} else {
				this.$toast.error( result.error || "Could not remove the secret." );
			}
			await this.load();
		},

		/** Reads where the key is and who used which secret (admin). */
		async loadActivity() {
			const result = await this.$api.get( "/vault/activity" );
			if ( !result.ok || !Array.isArray( result.data.activity ) ) {
				return;
			}
			const key = result.data.key || {};
			this.activity = {
				note: "The key is " + ( KEY_SOURCES[ key.keySource ] || String( key.keySource || "" ) ) + ". " + ( key.secrets || 0 ) + " sealed."
					+ ( key.wrongKey ? " " + key.wrongKey + " were sealed with another key and cannot be opened." : "" ),
				lines: result.data.activity
			};
		}
	};
}
