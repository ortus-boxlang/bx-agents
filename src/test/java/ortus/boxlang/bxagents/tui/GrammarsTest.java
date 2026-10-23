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

import static com.google.common.truth.Truth.assertThat;

import java.util.List;
import java.util.stream.Collectors;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import dev.tamboui.style.Style;
import dev.tamboui.text.Line;
import dev.tamboui.text.Span;
import dev.tamboui.widgets.syntax.SyntaxTheme;

/**
 * The code-block highlighter: the languages TamboUI does not know and the ones it does.
 */
@DisplayName( "Syntax grammars" )
class GrammarsTest {

	private static final Style PLAIN = Style.EMPTY;

	private static List<Line> highlight( String language, String code ) {
		return Grammars.highlighter().highlight( language, code, PLAIN, SyntaxTheme.DEFAULTS );
	}

	private static String text( List<Line> lines ) {
		return lines.stream().map( Line::rawContent ).collect( Collectors.joining( "\n" ) );
	}

	/** The style the highlighter gave the first span whose text is exactly {@code word}. */
	private static Style styleOf( List<Line> lines, String word ) {
		for ( Line l : lines ) {
			for ( Span s : l.spans() ) {
				if ( s.content().equals( word ) ) {
					return s.style();
				}
			}
		}
		throw new AssertionError( "no span reads '" + word + "' in " + text( lines ) );
	}

	@Test
	@DisplayName( "BoxLang: keywords, types, strings, comments and calls are coloured apart, and the text is untouched" )
	void boxlang() {
		String		code	= "function greet( string name ) {\n\treturn uCase( \"hi\" ) // done\n}";
		List<Line>	lines	= highlight( "boxlang", code );
		assertThat( text( lines ) ).isEqualTo( code );
		assertThat( styleOf( lines, "function" ) ).isNotEqualTo( PLAIN );
		assertThat( styleOf( lines, "string" ) ).isNotEqualTo( PLAIN );
		assertThat( styleOf( lines, "string" ) ).isNotEqualTo( styleOf( lines, "function" ) );
		assertThat( styleOf( lines, "\"hi\"" ) ).isNotEqualTo( PLAIN );
		assertThat( styleOf( lines, "uCase" ) ).isNotEqualTo( PLAIN );
	}

	@Test
	@DisplayName( "BoxLang: bx and bxs are the same language" )
	void boxlangAliases() {
		assertThat( highlight( "bx", "return 1" ) ).isEqualTo( highlight( "boxlang", "return 1" ) );
		assertThat( highlight( "bxs", "return 1" ) ).isEqualTo( highlight( "boxlang", "return 1" ) );
	}

	@Test
	@DisplayName( "CFML: tags, attributes, #expressions# and script words, ignoring case" )
	void cfml() {
		String		code	= "<cfset name = \"x\">\n<cfoutput>#name#</cfoutput>\n<!--- a note --->\nFUNCTION f() {}";
		List<Line>	lines	= highlight( "cfml", code );
		assertThat( text( lines ) ).isEqualTo( code );
		assertThat( styleOf( lines, "<cfset" ) ).isNotEqualTo( PLAIN );
		assertThat( styleOf( lines, "#name#" ) ).isNotEqualTo( PLAIN );
		assertThat( styleOf( lines, "FUNCTION" ) ).isNotEqualTo( PLAIN );
		assertThat( highlight( "cfc", "x" ) ).isNotNull();
	}

	@Test
	@DisplayName( "BoxLang templates: bx: tags are tags" )
	void bxm() {
		List<Line> lines = highlight( "bxm", "<bx:output>#now()#</bx:output>" );
		assertThat( styleOf( lines, "<bx:output" ) ).isNotEqualTo( PLAIN );
	}

	@Test
	@DisplayName( "diff: added, removed and hunk lines each get their own colour" )
	void diff() {
		List<Line>	lines	= highlight( "diff", "@@ -1 +1 @@\n-old\n+new\n same" );
		Style		added	= lines.get( 2 ).spans().get( 0 ).style();
		Style		removed	= lines.get( 1 ).spans().get( 0 ).style();
		Style		hunk	= lines.get( 0 ).spans().get( 0 ).style();
		assertThat( added ).isNotEqualTo( PLAIN );
		assertThat( removed ).isNotEqualTo( PLAIN );
		assertThat( added ).isNotEqualTo( removed );
		assertThat( hunk ).isNotEqualTo( added );
	}

	@Test
	@DisplayName( "TOML and Markdown highlight, and the built-in languages are still there" )
	void others() {
		assertThat( styleOf( highlight( "toml", "[server]\nport = 8080" ), "[server]" ) ).isNotEqualTo( PLAIN );
		assertThat( styleOf( highlight( "md", "# Title" ), "# Title" ) ).isNotEqualTo( PLAIN );
		assertThat( styleOf( highlight( "java", "int x = 1;" ), "int" ) ).isNotEqualTo( PLAIN );
		assertThat( styleOf( highlight( "json", "{ \"a\": true }" ), "true" ) ).isNotEqualTo( PLAIN );
	}

	@Test
	@DisplayName( "An unknown language is shown as plain text" )
	void unknown() {
		List<Line> lines = highlight( "klingon", "qapla'" );
		assertThat( text( lines ) ).isEqualTo( "qapla'" );
	}
}
