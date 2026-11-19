/**
 * ESLint for the web app's scripts: the rules of cbGenesis (coldbox-templates/cbgenesis/eslint.config.mjs), as they are,
 * on top of ESLint's recommended checks. Tabs, double quotes, semicolons, spaces inside parentheses and brackets,
 * aligned object colons.
 */
import js from "@eslint/js";
import globals from "globals";

export default [
	// ======================================================================
	// Global ignores
	// ======================================================================
	{
		ignores : [
			"node_modules/**",
			"playwright-report/**",
			"test-results/**",
			".stack/**",
			"dev/**"
		]
	},

	js.configs.recommended,

	// ======================================================================
	// JavaScript / ES Modules (cbGenesis)
	// ======================================================================
	{
		files : [
			"resources/assets/js/**/*.js",
			"tests/**/*.js",
			"scripts/**/*.mjs",
			"*.js",
			"*.mjs"
		],
		languageOptions : {
			ecmaVersion : "latest",
			sourceType  : "module",
			globals     : {
				...globals.browser,
				...globals.node,
				Alpine : "readonly"
			}
		},
		rules : {
			"array-bracket-spacing" : [
				"error",
				"always",
				{
					singleValue     : true,
					arraysInArrays  : true,
					objectsInArrays : true
				}
			],
			"array-bracket-newline" : [
				"error",
				{ multiline: true }
			],
			"array-element-newline" : [
				"error",
				{ multiline: true, minItems: 2 }
			],
			"camelcase" : [
				"error",
				{ properties: "always" }
			],
			"indent" : [
				"error",
				"tab",
				{ ignoredNodes: [ "TemplateLiteral" ] }
			],
			"keyword-spacing" : [
				"error",
				{ after: true, before: true }
			],
			"key-spacing" : [
				"error",
				{
					singleLine : {
						beforeColon : false,
						afterColon  : true
					},
					multiLine : {
						beforeColon : true,
						afterColon  : true,
						align       : "colon"
					}
				}
			],
			"no-trailing-spaces" : [
				"error",
				{
					skipBlankLines : false,
					ignoreComments : false
				}
			],
			"no-fallthrough" : "error",

			// allow debugger during development only
			"no-debugger" : process.env.NODE_ENV === "production" ? "error" : "off",

			"object-curly-newline" : [
				"error",
				{ multiline: true }
			],
			"object-curly-spacing" : [
				"error",
				"always",
				{
					objectsInObjects : true,
					arraysInObjects  : true
				}
			],
			"object-property-newline" : [
				"error",
				{ allowAllPropertiesOnSameLine: true }
			],
			"prefer-promise-reject-errors" : "off",
			"quotes"                       : [
				"error",
				"double"
			],
			"semi" : [
				"error",
				"always"
			],
			"space-in-parens" : [
				"error",
				"always"
			],
			"space-before-function-paren" : [
				"error",
				{
					anonymous  : "never",
					named      : "never",
					asyncArrow : "never"
				}
			]
		}
	}
];
