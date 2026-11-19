/**
 * Live logs and the accessibility pass (UI 13): the Logs page with Live on while the agent writes lines, a filter that
 * reopens the stream, then the keyboard: a tab row moved with the arrows, and a dialog that hands the focus back.
 *
 * @param {import("playwright").Page} page The page
 * @param {Function} shot Saves a screenshot
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LOGS = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), "../../.stack/home/logs" );

/**
 * @param {string} level The level, as BoxLang writes it
 * @param {string} message What the line says
 */
function write( level, message ) {
	fs.mkdirSync( LOGS, { recursive: true } );
	fs.appendFileSync( path.join( LOGS, "routines.log" ), "[" + new Date().toISOString().replace( "Z", "" ).replace( ".", "," ) + "] [main] [" + level + "] [ROUTINES] [bxagents-root] [daily] " + message + "\n" );
}

export default async function tour( page, shot ) {
	const pause = ms => page.waitForTimeout( ms );
	// lines from an earlier run stay in the file: this run's carry their own number
	const run = "#" + String( Date.now() ).slice( -4 );
	await page.goto( "logs/routines" );
	await page.waitForLoadState( "networkidle" );
	await page.getByRole( "switch", { name: "Live" } ).check();
	await page.locator( ".pg-status", { hasText: "Live:" } ).waitFor();
	await pause( 600 );
	await shot( "live-on" );
	write( "INFO ", "Routine daily started " + run );
	await pause( 1600 );
	write( "WARN ", "The report took 12 s " + run );
	await pause( 1600 );
	write( "ERROR", "Could not send the report to slack: channel_not_found " + run );
	await page.getByText( "channel_not_found " + run ).waitFor();
	await pause( 800 );
	await shot( "lines-arrive-as-written" );

	await page.getByRole( "combobox", { name: "Level" } ).selectOption( "error" );
	await page.locator( ".pg-status", { hasText: "Live:" } ).waitFor();
	write( "INFO ", "Routine daily finished " + run );
	write( "ERROR", "Retry failed: channel_not_found " + run + " again" );
	await page.getByText( run + " again" ).waitFor();
	await pause( 800 );
	await shot( "errors-only-live" );

	await page.goto( "connectors" );
	await page.waitForLoadState( "networkidle" );
	await page.goto( "registry" );
	await page.waitForLoadState( "networkidle" );
	const tools = page.getByRole( "tab", { name: "Tools" } );
	await tools.focus();
	await pause( 500 );
	await page.keyboard.press( "ArrowRight" );
	await pause( 700 );
	await shot( "tab-row-with-the-arrow-keys" );
	await page.keyboard.press( "End" );
	await pause( 700 );

	await page.goto( "routines" );
	await page.waitForLoadState( "networkidle" );
	await page.getByRole( "button", { name: "New routine" } ).focus();
	await page.keyboard.press( "Enter" );
	await pause( 600 );
	await page.keyboard.press( "Tab" );
	await pause( 500 );
	await shot( "dialog-holds-the-focus" );
	await page.keyboard.press( "Escape" );
	await pause( 700 );
	await shot( "focus-back-on-new-routine" );
}
