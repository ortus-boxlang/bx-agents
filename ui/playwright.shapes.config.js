/**
 * The project shapes (dev/shapes): every page of the web app over a real server, for each way a project mounts it.
 * scripts/shapes.mjs builds and serves them; `npm run e2e:shapes` runs this.
 */
import { defineConfig } from "@playwright/test";

const port = Number( process.env.UI_SHAPES_PORT || 8791 );

export default defineConfig( {
	testDir       : "tests/shapes",
	timeout       : 120_000,
	expect        : { timeout: 15_000 },
	fullyParallel : false,
	workers       : 1,
	retries       : 0,
	reporter      : process.env.CI ? [
		[ "list" ],
		[
			"html",
			{ open: "never", outputFolder: "playwright-report-shapes" }
		]
	] : "list",
	use       : { trace: "off" },
	webServer : {
		command             : "node scripts/shapes.mjs",
		// scripts/shapes.mjs answers here once every shape does
		url                 : "http://127.0.0.1:" + ( port - 1 ) + "/",
		reuseExistingServer : true,
		timeout             : 900_000,
		stdout              : "pipe"
	}
} );
