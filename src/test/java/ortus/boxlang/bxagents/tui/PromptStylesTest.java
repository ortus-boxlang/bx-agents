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

/**
 * The prompt styles, their registry and the look read from Agent.yaml.
 */
@DisplayName( "Prompt styles" )
class PromptStylesTest {

	private static final Theme			COLOR		= new Theme( "truecolor" );

	/** the styles that ship; another test registers one of its own, so the registry is not the list to loop over */
	private static final List<String>	BUILT_IN	= List.of( "bars", "bars-hints", "rule", "box", "panel" );

	private static List<PromptStyle> builtIn() {
		return BUILT_IN.stream().map( PromptStyles::get ).collect( Collectors.toList() );
	}

	private static PromptState state( boolean working, int width ) {
		return new PromptState( List.of( "Show me code examples", "second line" ), 1, 6, working, working ? "working 12s" : "you",
		    List.of( "demo-assistant", "~/work/demo", "ada", "14:32" ), List.of( "ctx ~253", "fast-model" ),
		    working ? "esc stops · enter steers" : "enter send · ? keys", working, width );
	}

	private static String text( List<Row> rows ) {
		return rows.stream().map( Row::plainText ).collect( Collectors.joining( "\n" ) );
	}

	@Test
	@DisplayName( "the registry lists the five styles in order and finds them in any case" )
	void registry() {
		assertThat( PromptStyles.names().subList( 0, 5 ) ).containsExactly( "bars", "bars-hints", "rule", "box", "panel" ).inOrder();
		assertThat( PromptStyles.get( "BOX" ).name() ).isEqualTo( "box" );
		assertThat( PromptStyles.get( "nothing" ) ).isNull();
		assertThat( PromptStyles.getOrDefault( "nothing" ).name() ).isEqualTo( "bars" );
		assertThat( PromptStyles.getOrDefault( null ).name() ).isEqualTo( "bars" );
	}

	@Test
	@DisplayName( "a registered style can be chosen by name" )
	void custom() {
		PromptStyles.register( new AbstractPromptStyle( "plain-test", "text only" ) {

			@Override
			public List<Row> rows( PromptState s, Theme t ) {
				return List.of( Row.of( s.lines().get( 0 ), t.plain ) );
			}
		} );
		assertThat( PromptStyles.get( "plain-test" ).rows( state( false, 60 ), COLOR ).get( 0 ).plainText() ).isEqualTo( "Show me code examples" );
	}

	@Test
	@DisplayName( "every style shows the typed text, the widgets and the hints, and no row is wider than the screen" )
	void content() {
		for ( PromptStyle style : builtIn() ) {
			for ( boolean working : new boolean[] { false, true } ) {
				List<Row>	rows	= style.rows( state( working, 76 ), COLOR );
				String		all		= text( rows );
				assertThat( all ).contains( "Show me code examples" );
				assertThat( all ).contains( "second" );
				assertThat( all ).contains( "line" );
				assertThat( all ).contains( "ada" );
				assertThat( all ).contains( "ctx ~253" );
				assertThat( all ).contains( working ? "esc stops" : "enter send" );
				assertThat( all ).contains( "▏" );
				for ( Row r : rows ) {
					assertThat( r.width() ).isAtMost( 76 );
				}
			}
		}
	}

	@Test
	@DisplayName( "the recording mark shows only while recording" )
	void recording() {
		for ( PromptStyle style : builtIn() ) {
			assertThat( text( style.rows( state( true, 76 ), COLOR ) ) ).contains( "● rec" );
			assertThat( text( style.rows( state( false, 76 ), COLOR ) ) ).doesNotContain( "● rec" );
		}
	}

	@Test
	@DisplayName( "bars: a bar above, a bar below, and the hint row last" )
	void bars() {
		List<Row> rows = PromptStyles.get( "bars" ).rows( state( false, 76 ), COLOR );
		assertThat( rows ).hasSize( 5 );
		assertThat( rows.get( 0 ).plainText() ).startsWith( "── you · demo-assistant" );
		assertThat( rows.get( 3 ).plainText() ).isEqualTo( "─".repeat( 76 ) );
		assertThat( rows.get( 4 ).plainText() ).startsWith( " enter send" );
		assertThat( rows.get( 4 ).plainText() ).endsWith( "fast-model" );
	}

	@Test
	@DisplayName( "bars-hints: the hints sit in the lower bar" )
	void barsHints() {
		List<Row> rows = PromptStyles.get( "bars-hints" ).rows( state( false, 76 ), COLOR );
		assertThat( rows ).hasSize( 4 );
		assertThat( rows.get( 3 ).plainText() ).startsWith( "── enter send" );
		assertThat( rows.get( 3 ).plainText() ).endsWith( "──" );
	}

	@Test
	@DisplayName( "rule: one rule above, then the box, then the hint row" )
	void rule() {
		List<Row> rows = PromptStyles.get( "rule" ).rows( state( false, 76 ), COLOR );
		assertThat( rows ).hasSize( 4 );
		assertThat( rows.get( 3 ).plainText() ).startsWith( " enter send" );
	}

	@Test
	@DisplayName( "box: rounded corners, and every row exactly as wide as the screen" )
	void box() {
		List<Row> rows = PromptStyles.get( "box" ).rows( state( false, 76 ), COLOR );
		assertThat( rows.get( 0 ).plainText() ).startsWith( "╭─ you" );
		assertThat( rows.get( 0 ).plainText() ).endsWith( "╮" );
		assertThat( rows.get( 1 ).plainText() ).startsWith( "│" );
		assertThat( rows.get( 1 ).plainText() ).endsWith( "│" );
		assertThat( rows.get( rows.size() - 1 ).plainText() ).startsWith( "╰─" );
		assertThat( rows.get( rows.size() - 1 ).plainText() ).endsWith( "─╯" );
		for ( Row r : rows ) {
			assertThat( r.width() ).isEqualTo( 76 );
		}
	}

	@Test
	@DisplayName( "panel: a left bar on every row of the panel, and the rule style where there is no background colour" )
	void panel() {
		List<Row> rows = PromptStyles.get( "panel" ).rows( state( false, 76 ), COLOR );
		for ( int i = 0; i < rows.size() - 1; i++ ) {
			assertThat( rows.get( i ).plainText() ).startsWith( "▌" );
			// the terminal drops plain spaces at the end of a line, and the background with them: the fill must be something else
			assertThat( rows.get( i ).width() ).isEqualTo( 76 );
			assertThat( rows.get( i ).plainText().endsWith( " " ) ).isFalse();
		}
		Theme none = new Theme( "none" );
		assertThat( text( PromptStyles.get( "panel" ).rows( state( false, 76 ), none ) ) )
		    .isEqualTo( text( PromptStyles.get( "rule" ).rows( state( false, 76 ), none ) ) );
	}

	@Test
	@DisplayName( "the edges are the accent colour at rest and amber while the agent works" )
	void tone() {
		assertThat( PromptStyles.get( "bars" ).rows( state( false, 76 ), COLOR ).get( 0 ).toLine().spans().get( 0 ).style() ).isEqualTo( COLOR.accent );
		assertThat( PromptStyles.get( "bars" ).rows( state( true, 76 ), COLOR ).get( 0 ).toLine().spans().get( 0 ).style() ).isEqualTo( COLOR.warn );
	}

	@Test
	@DisplayName( "on a narrow screen the last widgets drop off and nothing wraps; a long line scrolls to the caret" )
	void narrow() {
		PromptState s = new PromptState( List.of( "x".repeat( 60 ) + "END" ), 0, 63, false, "you", List.of( "demo-assistant", "~/work/demo", "ada", "14:32" ),
		    List.of( "ctx ~253", "fast-model" ), "enter send · ? keys", false, 40 );
		for ( PromptStyle style : builtIn() ) {
			List<Row> rows = style.rows( s, COLOR );
			for ( Row r : rows ) {
				assertThat( r.width() ).isAtMost( 40 );
			}
			assertThat( text( rows ) ).contains( "END▏" );
			assertThat( text( rows ) ).doesNotContain( "14:32" );
		}
	}

	@Test
	@DisplayName( "PromptLook: no tui block gives the defaults" )
	void lookDefaults() {
		PromptLook look = PromptLook.of( null );
		assertThat( look.style() ).isEqualTo( "bars" );
		assertThat( look.top() ).containsExactly( "agent", "folder", "user", "clock" ).inOrder();
		assertThat( look.bottom() ).containsExactly( "ctx", "profile" ).inOrder();
	}

	@Test
	@DisplayName( "PromptLook: reads the style and the widgets, drops names it does not know, and an empty list stays empty" )
	void lookFromYaml() {
		PromptLook look = PromptLook
		    .of( java.util.Map.of( "prompt", "Box", "widgets", java.util.Map.of( "top", List.of( "git", "nope", "git", "clock" ), "bottom", List.of() ) ) );
		assertThat( look.style() ).isEqualTo( "box" );
		assertThat( look.top() ).containsExactly( "git", "clock" ).inOrder();
		assertThat( look.bottom() ).isEmpty();
		assertThat( PromptLook.of( java.util.Map.of( "prompt", "nothing" ) ).style() ).isEqualTo( "bars" );
	}
}
