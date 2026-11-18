/**
 * What the server tells the page about itself, read once from the JSON block the layout writes
 * (`<script type="application/json" id="bxagents-config">`). Read as data, never run as code.
 *
 * @returns {{ basePath: string, apiBase: string, title: string, signIn: boolean, loginUrl: string, logoutUrl: string }} The settings
 */
export function readConfig() {
	const block = document.getElementById( "bxagents-config" );
	const defaults = { basePath: "", apiBase: "/__bxagents", title: "", signIn: false, loginUrl: "", logoutUrl: "" };
	if ( !block ) {
		return defaults;
	}
	try {
		return { ...defaults, ...JSON.parse( block.textContent ) };
	} catch ( e ) {
		return defaults;
	}
}
