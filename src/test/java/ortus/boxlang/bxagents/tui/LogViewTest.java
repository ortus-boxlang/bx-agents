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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import dev.tamboui.tui.event.KeyCode;
import dev.tamboui.tui.event.KeyEvent;
import dev.tamboui.tui.event.KeyModifiers;

/**
 * The full-screen log viewer's state, without a terminal: keys, lines and what it draws.
 */
class LogViewTest {

	private static final Theme			PLAIN	= Theme.detect( "1", "xterm", null );
	private static final List<String>	AREAS	= List.of( "agent", "gateways", "routines", "heartbeat", "api" );

	private static Map<String, String> line( String level, String message ) {
		return Map.of( "time", "2026-11-19T05:00:00,000", "level", level, "subject", "", "message", message );
	}

	private static List<Map<String, String>> lines( int count ) {
		List<Map<String, String>> out = new ArrayList<>();
		for ( int i = 1; i <= count; i++ ) {
			out.add( line( "info", "line " + i ) );
		}
		return out;
	}

	private static String screen( LogView v, int height ) {
		return v.render( 100, height ).stream().map( Row::plainText ).collect( Collectors.joining( "\n" ) );
	}

	private static KeyEvent ch( char c ) {
		return KeyEvent.ofChar( c );
	}

	@Test
	@DisplayName( "opens the log asked for, and the arrows and Tab move between the logs, round the ends" )
	void areas() {
		LogView v = new LogView( PLAIN, AREAS, "routines" );
		assertThat( v.area() ).isEqualTo( "routines" );
		v.key( KeyEvent.ofKey( KeyCode.RIGHT ) );
		assertThat( v.area() ).isEqualTo( "heartbeat" );
		assertThat( v.takeChange() ).isTrue();
		assertThat( v.takeChange() ).isFalse();
		v.key( KeyEvent.ofKey( KeyCode.TAB ) );
		v.key( KeyEvent.ofKey( KeyCode.TAB ) );
		assertThat( v.area() ).isEqualTo( "agent" );
		v.key( KeyEvent.ofKey( KeyCode.LEFT ) );
		assertThat( v.area() ).isEqualTo( "api" );
		assertThat( new LogView( PLAIN, AREAS, "nope" ).area() ).isEqualTo( "agent" );
	}

	@Test
	@DisplayName( "l steps the level through all, warn and error" )
	void level() {
		LogView v = new LogView( PLAIN, AREAS, "agent" );
		assertThat( v.level() ).isEqualTo( "" );
		v.key( ch( 'l' ) );
		assertThat( v.level() ).isEqualTo( "warn" );
		v.key( ch( 'l' ) );
		assertThat( v.level() ).isEqualTo( "error" );
		assertThat( screen( v, 10 ) ).contains( "level error and above" );
		v.key( ch( 'l' ) );
		assertThat( v.level() ).isEqualTo( "" );
	}

	@Test
	@DisplayName( "/ types a search that Enter keeps and Esc drops, and keys typed there do not act" )
	void search() {
		LogView v = new LogView( PLAIN, AREAS, "agent" );
		v.key( ch( '/' ) );
		for ( char c : "tele q".toCharArray() ) {
			v.key( ch( c ) );
		}
		v.key( KeyEvent.ofKey( KeyCode.BACKSPACE ) );
		v.key( KeyEvent.ofKey( KeyCode.BACKSPACE ) );
		assertThat( v.isDone() ).isFalse();
		assertThat( screen( v, 10 ) ).contains( "search tele_" );
		v.key( KeyEvent.ofKey( KeyCode.ENTER ) );
		assertThat( v.query() ).isEqualTo( "tele" );
		assertThat( v.takeChange() ).isTrue();

		v.key( ch( '/' ) );
		v.key( ch( 'x' ) );
		v.key( KeyEvent.ofKey( KeyCode.ESCAPE ) );
		assertThat( v.query() ).isEqualTo( "tele" );
		assertThat( v.takeChange() ).isFalse();
		assertThat( v.isDone() ).isFalse();
	}

	@Test
	@DisplayName( "shows the newest lines that fit, and says when there are none" )
	void render() {
		LogView v = new LogView( PLAIN, AREAS, "gateways" );
		assertThat( screen( v, 10 ) ).contains( "Nothing logged here yet." );
		v.setLines( lines( 30 ) );
		String shown = screen( v, 10 );
		assertThat( shown ).contains( "line 30" );
		assertThat( shown ).doesNotContain( "line 20" );
		assertThat( shown ).contains( "[gateways]" );
		assertThat( v.render( 100, 10 ) ).hasSize( 10 );
		v.setLines( List.of( line( "error", "telegram failed" ) ) );
		assertThat( screen( v, 10 ) ).contains( "05:00:00 ERROR  telegram failed" );
	}

	@Test
	@DisplayName( "scrolls up and stays on the same lines as new ones arrive; End follows the end again" )
	void scroll() {
		LogView v = new LogView( PLAIN, AREAS, "agent" );
		v.setLines( lines( 50 ) );
		screen( v, 10 );
		v.key( KeyEvent.ofKey( KeyCode.UP ) );
		v.key( KeyEvent.ofKey( KeyCode.UP ) );
		assertThat( screen( v, 10 ) ).contains( "line 48" );
		assertThat( screen( v, 10 ) ).doesNotContain( "line 49" );
		assertThat( screen( v, 10 ) ).contains( "paused" );
		v.append( List.of( line( "info", "line 51" ) ), 1000 );
		assertThat( screen( v, 10 ) ).contains( "line 48" );
		assertThat( screen( v, 10 ) ).doesNotContain( "line 51" );
		v.key( KeyEvent.ofKey( KeyCode.END ) );
		assertThat( screen( v, 10 ) ).contains( "line 51" );
		v.key( KeyEvent.ofKey( KeyCode.HOME ) );
		assertThat( screen( v, 10 ) ).contains( "line 1" );
		v.key( KeyEvent.ofKey( KeyCode.PAGE_DOWN ) );
		assertThat( screen( v, 10 ) ).doesNotContain( "line 1\n" );
	}

	@Test
	@DisplayName( "keeps only the last lines up to the cap" )
	void cap() {
		LogView v = new LogView( PLAIN, AREAS, "agent" );
		v.setLines( lines( 5 ) );
		v.append( lines( 5 ), 6 );
		assertThat( v.size() ).isEqualTo( 6 );
	}

	@Test
	@DisplayName( "q, Esc and Ctrl+C leave" )
	void quit() {
		for ( KeyEvent k : List.of( ch( 'q' ), KeyEvent.ofKey( KeyCode.ESCAPE ), KeyEvent.ofChar( 'c', KeyModifiers.CTRL ) ) ) {
			LogView v = new LogView( PLAIN, AREAS, "agent" );
			v.key( k );
			assertThat( v.isDone() ).isTrue();
		}
	}

}
