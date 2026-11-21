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

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName( "Header" )
class HeaderTest {

	private static final Theme THEME = Theme.detect( null, "xterm-256color", "truecolor" );

	private static Header.Facts facts( List<String> skills, List<String> extensions, List<String> failed ) {
		return new Header.Facts( "acme-support", "1.0.0", "fast-model", "in-process", List.of( "enter send · / commands", "esc stops" ),
		    List.of( new Header.Group( "skills", skills, List.of() ), new Header.Group( "extensions", extensions, failed ) ) );
	}

	private static String text( List<Row> rows ) {
		return String.join( "\n", rows.stream().map( Row::plainText ).toList() );
	}

	@Test
	@DisplayName( "the name of the agent follows the name of the project on the title line, and there is no tagline" )
	void title() {
		String shown = text( Header.rows( THEME, facts( List.of(), List.of(), List.of() ), 100 ) );
		assertThat( shown ).contains( "B X A G E N T S  ·  acme-support" );
		assertThat( shown ).contains( "v1.0.0 · fast-model · in-process" );
		assertThat( shown ).doesNotContain( "AI agents" );
	}

	@Test
	@DisplayName( "the mark has all its rows with a blank row above and below, and no row is wider than the terminal" )
	void shape() {
		List<Row> rows = Header.rows( THEME, facts( List.of( "a" ), List.of( "b" ), List.of() ), 100 );
		assertThat( rows ).hasSize( Logo.height() + 2 );
		for ( Row r : rows ) {
			assertThat( r.width() ).isAtMost( 100 );
		}
	}

	@Test
	@DisplayName( "skills and extensions each get a line when there are some, and none when there are not" )
	void loadedLines() {
		String with = text( Header.rows( THEME, facts( List.of( "code-review", "sql" ), List.of( "git" ), List.of() ), 100 ) );
		assertThat( with ).contains( "skills      code-review, sql" );
		assertThat( with ).contains( "extensions  git" );
		String without = text( Header.rows( THEME, facts( List.of(), List.of(), List.of() ), 100 ) );
		assertThat( without ).doesNotContain( "skills" );
		assertThat( without ).doesNotContain( "extensions" );
	}

	@Test
	@DisplayName( "a long list is cut with how many more there are, and what failed to load is marked" )
	void longAndFailed() {
		List<String>	many	= java.util.stream.IntStream.range( 0, 40 ).mapToObj( i -> "skill-number-" + i ).toList();
		Row				row		= Header.loaded( THEME, "skills", many, List.of(), 60 );
		assertThat( row.width() ).isAtMost( 60 );
		assertThat( row.plainText() ).contains( "more" );
		assertThat( row.plainText() ).startsWith( "skills      skill-number-0, " );
		Row bad = Header.loaded( THEME, "extensions", List.of( "git" ), List.of( "broken (failed)" ), 60 );
		assertThat( bad.plainText() ).contains( "broken (failed)" );
	}

	@Test
	@DisplayName( "a long agent name is cut so the title fits, and a small terminal does not get the full heading" )
	void narrow() {
		Header.Facts f = new Header.Facts( "a-very-long-agent-name-that-will-not-fit-anywhere", "", "m", "x", List.of(), List.of() );
		for ( Row r : Header.rows( THEME, f, Logo.width() + 2 + Header.GAP + Header.MIN_TEXT ) ) {
			assertThat( r.width() ).isAtMost( Logo.width() + 2 + Header.GAP + Header.MIN_TEXT );
		}
		assertThat( Header.fits( 80, 24 ) ).isTrue();
		assertThat( Header.fits( 60, 40 ) ).isFalse();
		assertThat( Header.fits( 120, 18 ) ).isFalse();
	}

	@Test
	@DisplayName( "all five lines of what is loaded and both lines of keys fit beside the mark, and a line with nothing in it is left out" )
	void everyLine() {
		Header.Facts	f		= new Header.Facts( "acme-support", "1.0.0", "fast-model", "in-process", List.of( "enter send", "esc stops" ),
		    List.of( new Header.Group( "skills", List.of( "a" ), List.of() ), new Header.Group( "extensions", List.of( "b" ), List.of() ),
		        new Header.Group( "connectors", List.of( "github ✓" ), List.of( "slack (sign in)" ) ), new Header.Group( "gateways", List.of(), List.of() ),
		        new Header.Group( "mcp", List.of( "docs" ), List.of() ) ) );
		String			shown	= text( Header.rows( THEME, f, 100 ) );
		for ( String want : List.of( "skills", "extensions", "connectors  github ✓, slack (sign in)", "mcp", "enter send", "esc stops" ) ) {
			assertThat( shown ).contains( want );
		}
		assertThat( shown ).doesNotContain( "gateways" );
	}

}
