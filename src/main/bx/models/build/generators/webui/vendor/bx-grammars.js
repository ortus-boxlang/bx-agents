// highlight.js grammars for BoxLang and CFML. `words` holds the lists from
// ortus.boxlang.bxagents.tui.Grammars.words() (the terminal's grammars use the same lists).
function registerBoxLangGrammars( hljs, words ) {
	function list( key ) {
		return ( words[ key ] || "" ).trim().split( /\s+/ ).filter( Boolean ).join( " " );
	}

	var STRING = {
		className: "string",
		variants: [
			{ begin: /"/, end: /"/, contains: [ { begin: /""/ } ] },
			{ begin: /'/, end: /'/, contains: [ { begin: /''/ } ] },
			{ begin: /`/, end: /`/ }
		]
	};
	var ANNOTATION = { className: "meta", begin: /@[A-Za-z_][\w.]*/ };
	var CALL = { className: "title function_", begin: /[A-Za-z_]\w*(?=\()/, relevance: 0 };

	function script( set, ignoreCase ) {
		return {
			case_insensitive: ignoreCase,
			keywords: {
				keyword: list( set + ".keywords" ),
				type: list( set + ".types" ),
				literal: list( set + ".constants" ),
				built_in: list( set + ".scopes" )
			},
			contains: [ hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE, STRING, ANNOTATION, hljs.C_NUMBER_MODE, CALL ]
		};
	}

	function template( set, ignoreCase ) {
		var def = script( set, ignoreCase );
		def.contains = [
			hljs.COMMENT( "<!---", "--->" ),
			hljs.COMMENT( "<!--", "-->" ),
			{
				className: "tag",
				begin: /<\/?(?:cf|bx:)?[A-Za-z_][\w:-]*/,
				end: />/,
				contains: [ { className: "attr", begin: /[A-Za-z_][\w:-]*(?==)/ }, STRING, { className: "template-variable", begin: /#[^#\n]*#/ } ]
			},
			{ className: "template-variable", begin: /#[^#\n]*#/ }
		].concat( def.contains );
		return def;
	}

	hljs.registerLanguage( "boxlang", function () { return script( "boxlang", false ); } );
	hljs.registerAliases( [ "bx", "bxs" ], { languageName: "boxlang" } );
	hljs.registerLanguage( "bxm", function () { return template( "boxlang", false ); } );
	hljs.registerAliases( [ "bxml" ], { languageName: "bxm" } );
	hljs.registerLanguage( "cfml", function () { return template( "cfml", true ); } );
	hljs.registerAliases( [ "cfm", "cfc", "cfs", "cfscript", "coldfusion" ], { languageName: "cfml" } );
}
