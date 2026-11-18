/**
 * ESLint for the web app's scripts, with cbGenesis' style: tabs, double quotes, semicolons, spaces inside parentheses
 * and brackets, aligned object colons.
 */
import js from "@eslint/js";
import globals from "globals";

export default [
	{ ignores: [ "node_modules/**", "playwright-report/**", "test-results/**", ".stack/**", "dev/**" ] },
	js.configs.recommended,
	{
		files          : [ "resources/assets/js/**/*.js", "tests/**/*.js", "scripts/**/*.mjs", "*.js", "*.mjs" ],
		languageOptions: {
			ecmaVersion: 2023,
			sourceType : "module",
			globals    : { ...globals.browser, ...globals.node }
		},
		rules: {
			"indent"                   : [ "error", "tab", { SwitchCase: 1 } ],
			"quotes"                   : [ "error", "double", { avoidEscape: true } ],
			"semi"                     : [ "error", "always" ],
			"space-in-parens"          : [ "error", "always", { exceptions: [ "empty" ] } ],
			"array-bracket-spacing"    : [ "error", "always" ],
			"computed-property-spacing": [ "error", "always" ],
			"template-curly-spacing"   : [ "error", "always" ],
			"key-spacing"              : [ "error", { align: "colon", beforeColon: false, afterColon: true } ],
			"no-unused-vars"           : [ "error", { args: "after-used", argsIgnorePattern: "^_", caughtErrors: "none" } ],
			"eqeqeq"                   : [ "error", "always" ],
			"curly"                    : [ "error", "all" ],
			"no-var"                   : "error",
			"prefer-const"             : "error"
		}
	}
];
