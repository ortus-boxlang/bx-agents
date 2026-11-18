/**
 * The browser tests of the web app. They run against the dev agent (ui/dev/agent) with the scripted model, started by
 * scripts/stack.mjs, so they need no key and no network. A stack you already started (npm run stack) is reused.
 */
import { defineConfig } from "@playwright/test";

const port = process.env.UI_AGENT_PORT || 8780;

export default defineConfig( {
	testDir      : "tests/e2e",
	timeout      : 60_000,
	expect       : { timeout: 15_000 },
	fullyParallel: false,
	workers      : 1,
	retries      : process.env.CI ? 1 : 0,
	reporter     : process.env.CI ? [ [ "list" ], [ "html", { open: "never" } ] ] : "list",
	globalSetup  : "./tests/e2e/global-setup.js",
	use          : {
		baseURL: "http://127.0.0.1:" + port + "/chat/",
		trace  : "off"
	},
	webServer: {
		command            : "node scripts/stack.mjs",
		url                : "http://127.0.0.1:" + port + "/chat/",
		reuseExistingServer: true,
		timeout            : 300_000,
		stdout             : "pipe"
	}
} );
