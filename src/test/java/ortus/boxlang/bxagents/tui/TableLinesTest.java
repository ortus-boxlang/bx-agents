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

import dev.tamboui.text.Line;
import dev.tamboui.text.Span;

/**
 * Tables drawn with borders, and how an answer is cut around them.
 */
@DisplayName( "Bordered tables" )
class TableLinesTest {

	private static final Theme COLOR = new Theme( "truecolor" );

	private static List<String> table( String... lines ) {
		return List.of( lines );
	}

	private static List<String> text( List<Line> lines ) {
		return lines.stream().map( Line::rawContent ).collect( Collectors.toList() );
	}

	@Test
	@DisplayName( "a header and a delimiter row with the same columns begin a table; anything else does not" )
	void starts() {
		assertThat( TableLines.starts( "| a | b |", "|---|---|" ) ).isTrue();
		assertThat( TableLines.starts( "a | b", "--- | ---" ) ).isTrue();
		assertThat( TableLines.starts( "| a | b |", "|:--|--:|" ) ).isTrue();
		assertThat( TableLines.starts( "| a | b |", "|---|" ) ).isFalse();
		assertThat( TableLines.starts( "just text", "|---|---|" ) ).isFalse();
		assertThat( TableLines.starts( "| a | b |", "not a delimiter" ) ).isFalse();
		assertThat( TableLines.starts( "| a | b |", null ) ).isFalse();
	}

	@Test
	@DisplayName( "cells split on pipes that are not escaped, without the pipes at the ends" )
	void cells() {
		assertThat( TableLines.cells( "| a | b \\| c | d |" ) ).containsExactly( "a", "b | c", "d" ).inOrder();
		assertThat( TableLines.cells( "a | b" ) ).containsExactly( "a", "b" ).inOrder();
	}

	@Test
	@DisplayName( "a small table is drawn with rounded corners, a rule under the header, and one width throughout" )
	void drawn() {
		List<String> out = text(
		    TableLines.render( table( "| Language | Where it runs |", "|---|---|", "| BoxLang | the JVM |", "| Java | the JVM |" ), 80, COLOR ) );
		assertThat( out ).containsExactly(
		    "╭──────────┬───────────────╮",
		    "│ Language │ Where it runs │",
		    "├──────────┼───────────────┤",
		    "│ BoxLang  │ the JVM       │",
		    "│ Java     │ the JVM       │",
		    "╰──────────┴───────────────╯" ).inOrder();
	}

	@Test
	@DisplayName( "the delimiter row sets the alignment of each column" )
	void alignment() {
		List<String> out = text( TableLines.render( table( "| left | mid | right |", "|:--|:-:|--:|", "| a | b | c |" ), 80, COLOR ) );
		assertThat( out.get( 3 ) ).isEqualTo( "│ a    │  b  │     c │" );
	}

	@Test
	@DisplayName( "the edges are the accent colour and the header is bold" )
	void colours() {
		List<Line> lines = TableLines.render( table( "| Name |", "|---|", "| x |" ), 80, COLOR );
		assertThat( lines.get( 0 ).spans().get( 0 ).style() ).isEqualTo( COLOR.accent );
		Span header = lines.get( 1 ).spans().stream().filter( s -> s.content().equals( "Name" ) ).findFirst().get();
		assertThat( header.style() ).isEqualTo( COLOR.accentBold );
	}

	@Test
	@DisplayName( "code, bold and italics in a cell keep their look, and the marks are not shown" )
	void inline() {
		List<Line>	lines	= TableLines.render( table( "| a |", "|---|", "| `code` and **bold** and *it* |" ), 80, COLOR );
		String		row		= lines.get( 3 ).rawContent();
		assertThat( row ).contains( "code and bold and it" );
		assertThat( row ).doesNotContain( "`" );
		assertThat( row ).doesNotContain( "*" );
		Span code = lines.get( 3 ).spans().stream().filter( s -> s.content().equals( "code" ) ).findFirst().get();
		assertThat( code.style() ).isEqualTo( COLOR.ok );
	}

	@Test
	@DisplayName( "on a narrow screen cells wrap at spaces, every line stays the same width, and no word is lost" )
	void wraps() {
		List<String> out = text(
		    TableLines.render( table( "| Topic | Notes |", "|---|---|", "| Setup | install the module then run the build and chat with it |" ), 34, COLOR ) );
		for ( String line : out ) {
			assertThat( line.length() ).isEqualTo( out.get( 0 ).length() );
			assertThat( line.length() ).isAtMost( 34 );
		}
		String all = String.join( " ", out );
		for ( String word : "install the module then run the build and chat with it".split( " " ) ) {
			assertThat( all ).contains( word );
		}
		assertThat( out.size() ).isAtLeast( 7 );
	}

	@Test
	@DisplayName( "a table that cannot fit even its longest words comes back as null" )
	void tooNarrow() {
		assertThat( TableLines.render( table( "| alpha | beta | gamma |", "|---|---|---|", "| averyveryverylongword | b | c |" ), 20, COLOR ) ).isNull();
	}

	@Test
	@DisplayName( "an answer with a table gets text, the table and text again; a table in a code block is left alone" )
	void insideAnswer() {
		String			md	= "Before the table.\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\nAfter it.\n\n```\n| x | y |\n|---|---|\n```\n";
		List<String>	out	= text( MarkdownLines.render( md, 60, COLOR ) );
		String			all	= String.join( "\n", out );
		assertThat( all ).contains( "Before the table." );
		assertThat( all ).contains( "╭───┬───╮" );
		assertThat( all ).contains( "│ 1 │ 2 │" );
		assertThat( all ).contains( "After it." );
		assertThat( all.indexOf( "Before" ) < all.indexOf( "╭" ) ).isTrue();
		assertThat( all.indexOf( "╰" ) < all.indexOf( "After" ) ).isTrue();
		// the one inside the fence was not drawn with borders: only one table was built (the code block has its own frame)
		assertThat( all.indexOf( "┬" ) ).isEqualTo( all.lastIndexOf( "┬" ) );
		assertThat( all ).contains( "| x | y |" );
	}

	@Test
	@DisplayName( "a table too wide to fit is shown the way the Markdown view draws it, not lost" )
	void fallback() {
		String	md	= "| alpha | beta |\n|---|---|\n| averyveryveryveryverylongwordhere | b |\n";
		String	all	= String.join( "\n", text( MarkdownLines.render( md, 24, COLOR ) ) );
		assertThat( all ).contains( "alpha" );
		assertThat( all ).doesNotContain( "╭" );
	}
}
