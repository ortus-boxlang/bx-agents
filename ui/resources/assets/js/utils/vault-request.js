/**
 * When the agent asks for a secret (the vault_request tool), the chat sends the person to the Vault page with the ask
 * in the address: the value is typed there and never passes through the chat.
 *
 * @param {Array<{ name: string, args: string }>} tools The tool calls of a turn
 * @returns {{ name: string, why: string, scope: string } | null} The last secret asked for, or null
 */
export function vaultRequestOf( tools ) {
	let found = null;
	( tools || [] ).filter( t => t.name === "vault_request" ).forEach( t => {
		try {
			const parsed = JSON.parse( t.args );
			if ( parsed && /^[A-Za-z][A-Za-z0-9_]*$/.test( parsed.name || "" ) ) {
				found = { name: parsed.name, why: parsed.why || "", scope: parsed.scope === "agent" ? "agent" : "user" };
			}
		} catch {
			// an unfinished or malformed call asks for nothing
		}
	} );
	return found;
}

/**
 * @param {string} basePath Where the app is mounted
 * @param {{ name: string, why: string, scope: string }} ask What the agent asked for
 * @returns {string} The Vault page with the ask
 */
export function vaultAskUrl( basePath, ask ) {
	return basePath + "/vault?" + new URLSearchParams( { ask: ask.name, scope: ask.scope, why: ask.why } ).toString();
}
