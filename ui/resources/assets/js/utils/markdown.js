/**
 * Markdown from the model or a person, as HTML that is safe to put in the page. The only way the web app writes HTML from
 * text it did not make itself; `x-html` is used with $md and nowhere else. The same rules as the current page:
 * - HTML the model writes is shown as text, never parsed (an answer can echo anything it read);
 * - no pictures, frames, forms or styles (a remote picture would tell its server the page was opened);
 * - links open in a new tab, without the opener;
 * - code blocks are coloured by highlight.js (which escapes what it colours) and carry a Copy button.
 */
import { Marked } from "marked";
import DOMPurify from "dompurify";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

Object.entries( { bash, css, java, javascript, json, markdown, python, sql, typescript, xml, yaml } ).forEach( ( [ name, language ] ) => hljs.registerLanguage( name, language ) );
hljs.registerAliases( [ "sh", "shell", "zsh" ], { languageName: "bash" } );
hljs.registerAliases( [ "js" ], { languageName: "javascript" } );
hljs.registerAliases( [ "ts" ], { languageName: "typescript" } );
hljs.registerAliases( [ "html", "cfml", "bxm" ], { languageName: "xml" } );
hljs.registerAliases( [ "yml" ], { languageName: "yaml" } );
hljs.registerAliases( [ "bx", "bxs", "boxlang", "cfc", "cfscript" ], { languageName: "java" } );

/**
 * @param {string} text Any text
 * @returns {string} It, with &, <, > and " as entities
 */
export function escapeHtml( text ) {
	return String( text ).replace( /&/g, "&amp;" ).replace( /</g, "&lt;" ).replace( />/g, "&gt;" ).replace( /"/g, "&quot;" );
}

const parser = new Marked( {
	gfm     : true,
	breaks  : true,
	renderer: {
		html( token ) {
			return escapeHtml( token.text );
		},
		code( token ) {
			const lang = ( token.lang || "" ).trim().split( /\s+/ )[ 0 ].toLowerCase();
			const known = lang && hljs.getLanguage( lang );
			const body = known ? hljs.highlight( token.text, { language: lang, ignoreIllegals: true } ).value : escapeHtml( token.text );
			return "<div class=\"codeblock\"><div class=\"codehead\"><span class=\"lang\">" + escapeHtml( lang || "text" )
				+ "</span><button type=\"button\" class=\"copy-code\">Copy</button></div><pre><code class=\"hljs" + ( known ? " language-" + escapeHtml( lang ) : "" )
				+ "\">" + body + "</code></pre></div>";
		}
	}
} );

DOMPurify.addHook( "afterSanitizeAttributes", node => {
	if ( node.tagName === "A" && node.getAttribute( "href" ) ) {
		node.setAttribute( "target", "_blank" );
		node.setAttribute( "rel", "noopener noreferrer" );
	}
} );

/**
 * @param {string} text Markdown
 * @returns {string} Safe HTML
 */
export function renderMarkdown( text ) {
	return DOMPurify.sanitize( parser.parse( String( text || "" ), { async: false } ), {
		FORBID_TAGS: [ "img", "style", "form", "input", "iframe", "svg", "math" ],
		ADD_ATTR   : [ "target" ]
	} );
}

/**
 * Copies a code block when its Copy button is pressed: one listener for the whole page, so Markdown drawn at any time
 * gets it (the button is part of the HTML, it carries no handler of its own).
 *
 * @param {Document} doc The page
 */
export function listenForCodeCopy( doc ) {
	doc.addEventListener( "click", async evt => {
		const button = evt.target.closest && evt.target.closest( "button.copy-code" );
		if ( !button ) {
			return;
		}
		const code = button.closest( ".codeblock" ).querySelector( "code" );
		try {
			await navigator.clipboard.writeText( code.textContent );
			button.textContent = "Copied";
		} catch ( e ) {
			button.textContent = "Select and copy";
		}
		setTimeout( () => {
			button.textContent = "Copy";
		}, 1200 );
	} );
}
