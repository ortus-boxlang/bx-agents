/**
 * Signs in once as each dev account and keeps the session, so every test starts signed in.
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import { AUTH } from "./support.js";

/**
 * @param {import("@playwright/test").FullConfig} config The run's config
 * @returns {Promise<void>}
 */
export default async function globalSetup( config ) {
	const baseURL = config.projects[ 0 ].use.baseURL;
	fs.mkdirSync( AUTH, { recursive: true } );
	const browser = await chromium.launch();
	for ( const user of [ "ada", "bob" ] ) {
		const page = await browser.newPage();
		await page.goto( baseURL );
		await page.fill( "input[name=username]", user );
		await page.fill( "input[name=password]", "demo-pass" );
		await Promise.all( [ page.waitForNavigation(), page.click( "button[type=submit]" ) ] );
		await page.context().storageState( { path: AUTH + user + ".json" } );
		if ( user === "ada" ) {
			// the first turn of a fresh server compiles the whole path once: do it here, with a long wait
			await page.waitForSelector( "#input" );
			await page.fill( "#input", "warm up" );
			await page.click( "#sendBtn" );
			await page.waitForFunction( () => /scripted answer/.test( document.querySelector( "#messages" ).textContent ), null, { timeout: 180_000 } );
		}
		await page.close();
	}
	await browser.close();
}
