import { keepInAddress } from "../../utils/address.js";

/**
 * The Access page (admin): access tokens for the API (GET/POST /tokens, POST /tokens/revoke) and the people who can sign
 * in (GET /users, POST /users/admin). The tab comes from the address (data-tab, set by the Access handler).
 *
 * @returns {object} Alpine component state and actions
 */
export function accessPage() {
	return {
		/** @type {string} tokens | people */
		tab           : "tokens",
		/** @type {boolean} True when this server manages tokens from here */
		manages       : false,
		/** @type {Array<object>} The tokens */
		tokens        : [],
		/** @type {boolean} True until the tokens answered */
		tokensLoading : true,
		/** @type {string} Why the tokens could not be read */
		tokensFailed  : "",
		/** @type {{ name: string, scope: string, expires: string }} The new token form */
		form          : { name: "", scope: "chat", expires: "" },
		/** @type {boolean} True while a token is being made */
		making        : false,
		/** @type {{ name: string, token: string } | null} A token just made: shown once */
		made          : null,
		/** @type {Array<object>} The accounts */
		people        : [],
		/** @type {boolean} True until the accounts answered */
		peopleLoading : true,
		/** @type {string} Why the accounts could not be read */
		peopleFailed  : "",

		/** Picks the tab and loads it once the capabilities are known. */
		async init() {
			await this.$store.session.loaded();
			this.manages = this.$store.session.can( "tokens" );
			const wanted = this.$el.dataset.tab;
			this.tab = wanted === "people" || ( !this.manages && wanted !== "tokens" ) ? "people" : "tokens";
			this.$watch( "tab", tab => {
				keepInAddress( this.$store.session.config.basePath + "/access/" + tab );
				this.load();
			} );
			this.load();
		},

		/** Loads the open tab. */
		load() {
			return this.tab === "people" ? this.loadPeople() : this.loadTokens();
		},

		/** Reads the tokens. */
		async loadTokens() {
			if ( !this.manages ) {
				this.tokensLoading = false;
				return;
			}
			const result = await this.$api.get( "/tokens" );
			this.tokensLoading = false;
			this.tokensFailed = result.ok ? "" : "Could not load the tokens.";
			this.tokens = result.ok ? result.data.tokens || [] : [];
		},

		/** Makes a token and shows it once. */
		async makeToken() {
			this.making = true;
			const result = await this.$api.post( "/tokens", { name: this.form.name.trim(), scope: this.form.scope, expires: this.form.expires.trim() } );
			this.making = false;
			if ( !result.ok ) {
				this.$toast.error( result.error || "Could not create the token." );
				return;
			}
			this.made = { name: result.data.name, token: result.data.token };
			this.form = { name: "", scope: "chat", expires: "" };
			this.$toast.success( "Created " + result.data.name + "." );
			await this.loadTokens();
		},

		/** Copies the token just made. */
		async copyToken() {
			try {
				await navigator.clipboard.writeText( this.made.token );
				this.$toast.success( "Copied." );
			} catch {
				this.$toast.error( "Could not copy. Select the token and copy it." );
			}
		},

		/**
		 * Revokes a token, once the person agrees.
		 *
		 * @param {{ name: string }} token The token
		 */
		async revoke( token ) {
			const yes = await this.$confirm( { title: "Revoke " + token.name + "?", body: "Anything that uses it stops working at once.", yes: "Revoke", danger: true } );
			if ( !yes ) {
				return;
			}
			const result = await this.$api.post( "/tokens/revoke", { name: token.name } );
			if ( result.ok ) {
				this.$toast.success( "Revoked " + token.name + "." );
			} else {
				this.$toast.error( result.error || "Could not revoke the token." );
			}
			await this.loadTokens();
		},

		/**
		 * @param {{ expiresAt?: string, lastUsedAt?: string }} token A token
		 * @returns {string} "until 2027-02-16, used 2026-11-18"
		 */
		tokenUse( token ) {
			return ( token.expiresAt ? "until " + this.$fmt.dayText( token.expiresAt ) + ", " : "" )
				+ ( token.lastUsedAt ? "used " + this.$fmt.dayText( token.lastUsedAt ) : "never used" );
		},

		/** Reads the accounts. */
		async loadPeople() {
			const result = await this.$api.get( "/users" );
			this.peopleLoading = false;
			this.peopleFailed = result.ok ? "" : result.error || "Could not load the accounts.";
			this.people = result.ok ? result.data.users || [] : [];
		},

		/**
		 * Makes an account an admin, or a member again.
		 *
		 * @param {{ username: string, admin?: boolean }} person The account
		 */
		async toggleAdmin( person ) {
			const admin = !person.admin;
			const result = await this.$api.post( "/users/admin", { username: person.username, admin } );
			if ( result.ok ) {
				this.$toast.success( person.username + ( admin ? " is an admin now." : " is a member now." ) );
			} else {
				this.$toast.error( result.error || "Could not change that account." );
			}
			await this.loadPeople();
		}
	};
}
