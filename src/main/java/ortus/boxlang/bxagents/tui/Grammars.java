/**
 * [BoxLang]
 *
 * Copyright [2023] [Ortus Solutions, Corp]
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package ortus.boxlang.bxagents.tui;

import java.util.Properties;
import java.util.regex.Pattern;

import dev.tamboui.widgets.syntax.Grammar;
import dev.tamboui.widgets.syntax.Grammar.Rule;
import dev.tamboui.widgets.syntax.RegexSyntaxHighlighter;
import dev.tamboui.widgets.syntax.TokenType;

/**
 * The syntax highlighter for code blocks in the chat: TamboUI's built-in languages (Java, JSON,
 * YAML, SQL, shell and the like) plus the ones its users write in and TamboUI does not know:
 * BoxLang, CFML, diff, TOML and Markdown. The BoxLang and CFML word lists are here, in {@link #words()},
 * and the web UI's highlighter is built from the same lists, so the two always agree.
 */
public final class Grammars {

	private static RegexSyntaxHighlighter highlighter;

	private Grammars() {
	}

	/**
	 * @return the highlighter to hand to the Markdown view; built on first use
	 */
	public static synchronized RegexSyntaxHighlighter highlighter() {
		if ( highlighter == null ) {
			Properties words = words();
			highlighter = RegexSyntaxHighlighter.builder()
			    .add( script( "boxlang", new String[] { "bx", "bxs" }, words, "boxlang", false ) )
			    .add( template( "bxm", new String[] { "bxml" }, words, "boxlang", false ) )
			    .add( template( "cfml", new String[] { "cfm", "cfc", "cfs", "cfscript", "coldfusion" }, words, "cfml", true ) )
			    .add( diff() )
			    .add( toml() )
			    .add( markdown() )
			    .build();
		}
		return highlighter;
	}

	// ----------------------------------------------------------------------------------

	/**
	 * @return the BoxLang and CFML word lists ({@code boxlang.keywords}, {@code cfml.types} ...), each a space
	 *         separated string. Keywords, types and scopes match whole words; CFML ignores case, BoxLang does not.
	 */
	public static Properties words() {
		String		types		= "any array binary boolean date function numeric query string struct void xml";
		String		constants	= "true false null";
		String		scopes		= "application arguments cgi client cookie form local request server session super this url variables";
		Properties	p			= new Properties();
		p.setProperty( "boxlang.keywords",
		    "abstract assert break case catch class component continue default do else extends final finally for function if implements import in include interface new package param private property public remote required rethrow return static switch throw try var while abort exit lock thread transaction" );
		p.setProperty( "boxlang.types", types );
		p.setProperty( "boxlang.constants", constants );
		p.setProperty( "boxlang.scopes", scopes );
		p.setProperty( "cfml.keywords",
		    "abort abstract break case catch component continue default do else extends final finally for function if import in include interface lock new package param private property public remote required rethrow return static switch throw try var while exit thread transaction" );
		p.setProperty( "cfml.types", types );
		p.setProperty( "cfml.constants", constants );
		p.setProperty( "cfml.scopes", scopes );
		return p;
	}

	private static Grammar script( String id, String[] aliases, Properties words, String set, boolean ignoreCase ) {
		Grammar.Builder g = Grammar.builder( id ).alias( aliases );
		scriptRules( g, words, set, ignoreCase );
		return g.build();
	}

	/** A template: tags and #expressions# around script, so the script rules come last. */
	private static Grammar template( String id, String[] aliases, Properties words, String set, boolean ignoreCase ) {
		Grammar.Builder g = Grammar.builder( id ).alias( aliases );
		g.rule( Rule.multiline( TokenType.COMMENT, "<!---", "--->" ) );
		g.rule( Rule.multiline( TokenType.COMMENT, "<!--", "-->" ) );
		g.rule( Rule.pattern( TokenType.TAG, Pattern.compile( "</?(?:cf|bx:)[A-Za-z_]*|</?[A-Za-z][\\w-]*|/?>" ) ) );
		g.rule( Rule.pattern( TokenType.ATTRIBUTE, Pattern.compile( "[A-Za-z_][\\w:-]*(?==)" ) ) );
		g.rule( Rule.pattern( TokenType.ANNOTATION, Pattern.compile( "#[^#\\r\\n]*#" ) ) );
		scriptRules( g, words, set, ignoreCase );
		return g.build();
	}

	private static void scriptRules( Grammar.Builder g, Properties words, String set, boolean ignoreCase ) {
		g.rule( Rule.pattern( TokenType.COMMENT, Pattern.compile( "//.*" ) ) );
		g.rule( Rule.multiline( TokenType.COMMENT, "/*", "*/" ) );
		g.rule( Rule.pattern( TokenType.STRING, Pattern.compile( "\"(?:[^\"]|\"\")*\"|'(?:[^']|'')*'|`[^`]*`" ) ) );
		g.rule( Rule.pattern( TokenType.ANNOTATION, Pattern.compile( "@[A-Za-z_][\\w.]*" ) ) );
		g.rule( Rule.pattern( TokenType.NUMBER, Pattern.compile( "\\b\\d+(?:\\.\\d+)?\\b" ) ) );
		wordRule( g, TokenType.CONSTANT, words.getProperty( set + ".constants" ), ignoreCase );
		wordRule( g, TokenType.KEYWORD, words.getProperty( set + ".keywords" ), ignoreCase );
		wordRule( g, TokenType.TYPE, words.getProperty( set + ".types" ), ignoreCase );
		wordRule( g, TokenType.CONSTANT, words.getProperty( set + ".scopes" ), ignoreCase );
		g.rule( Rule.pattern( TokenType.FUNCTION, Pattern.compile( "[A-Za-z_]\\w*(?=\\()" ) ) );
	}

	private static void wordRule( Grammar.Builder g, TokenType type, String list, boolean ignoreCase ) {
		if ( list == null || list.isBlank() ) {
			return;
		}
		String alternatives = String.join( "|", list.trim().split( "\\s+" ) );
		g.rule( Rule.pattern( type, Pattern.compile( "\\b(?:" + alternatives + ")\\b", ignoreCase ? Pattern.CASE_INSENSITIVE : 0 ) ) );
	}

	private static Grammar diff() {
		return Grammar.builder( "diff" ).alias( "patch" )
		    .rule( Rule.linePattern( TokenType.COMMENT, Pattern.compile( "(?:diff |index |\\+\\+\\+ |--- ).*" ) ) )
		    .rule( Rule.linePattern( TokenType.FUNCTION, Pattern.compile( "@@.*" ) ) )
		    .rule( Rule.linePattern( TokenType.STRING, Pattern.compile( "\\+.*" ) ) )
		    .rule( Rule.linePattern( TokenType.CONSTANT, Pattern.compile( "-.*" ) ) )
		    .build();
	}

	private static Grammar toml() {
		return Grammar.builder( "toml" )
		    .rule( Rule.pattern( TokenType.COMMENT, Pattern.compile( "#.*" ) ) )
		    .rule( Rule.linePattern( TokenType.TAG, Pattern.compile( "\\[\\[?[^\\]]*\\]\\]?" ) ) )
		    .rule( Rule.pattern( TokenType.STRING, Pattern.compile( "\"(?:[^\"\\\\]|\\\\.)*\"|'[^']*'" ) ) )
		    .rule( Rule.linePattern( TokenType.ATTRIBUTE, Pattern.compile( "[\\w.-]+(?=\\s*=)" ) ) )
		    .rule( Rule.pattern( TokenType.NUMBER, Pattern.compile( "\\b\\d[\\d_.:-]*\\b" ) ) )
		    .rule( Rule.pattern( TokenType.CONSTANT, Pattern.compile( "\\b(?:true|false)\\b" ) ) )
		    .build();
	}

	private static Grammar markdown() {
		return Grammar.builder( "markdown" ).alias( "md" )
		    .rule( Rule.linePattern( TokenType.KEYWORD, Pattern.compile( "#{1,6} .*" ) ) )
		    .rule( Rule.linePattern( TokenType.OPERATOR, Pattern.compile( "\\s*(?:[-*+]|\\d+\\.)\\s" ) ) )
		    .rule( Rule.pattern( TokenType.STRING, Pattern.compile( "`[^`\\r\\n]+`" ) ) )
		    .rule( Rule.pattern( TokenType.ANNOTATION, Pattern.compile( "\\*\\*[^*\\r\\n]+\\*\\*" ) ) )
		    .rule( Rule.pattern( TokenType.FUNCTION, Pattern.compile( "\\[[^\\]\\r\\n]*\\]\\([^)\\r\\n]*\\)" ) ) )
		    .build();
	}
}
