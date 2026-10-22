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
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import dev.tamboui.tui.event.KeyCode;
import dev.tamboui.tui.event.KeyEvent;
import dev.tamboui.tui.event.KeyModifiers;
import ortus.boxlang.bxagents.tui.KeyMap.Action;

@DisplayName( "KeyMap" )
class KeyMapTest {

	@Test
	@DisplayName( "the defaults are the keys the screen has always had" )
	void defaults() {
		KeyMap map = KeyMap.defaults();
		assertThat( map.is( Action.SUBMIT, KeyEvent.ofKey( KeyCode.ENTER ) ) ).isTrue();
		assertThat( map.is( Action.SUBMIT, KeyEvent.ofKey( KeyCode.ENTER, KeyModifiers.ALT ) ) ).isFalse();
		assertThat( map.is( Action.NEWLINE, KeyEvent.ofKey( KeyCode.ENTER, KeyModifiers.ALT ) ) ).isTrue();
		assertThat( map.is( Action.NEWLINE, KeyEvent.ofChar( 'j', KeyModifiers.CTRL ) ) ).isTrue();
		assertThat( map.is( Action.STOP, KeyEvent.ofKey( KeyCode.ESCAPE ) ) ).isTrue();
		assertThat( map.is( Action.STOP, KeyEvent.ofChar( 'c', KeyModifiers.CTRL ) ) ).isTrue();
		assertThat( map.is( Action.CLEAR, KeyEvent.ofChar( 'c', KeyModifiers.CTRL ) ) ).isTrue();
		assertThat( map.problems() ).isEmpty();
		assertThat( map.describe( Action.NEWLINE ) ).isEqualTo( "Alt+Enter, Shift+Enter, Ctrl+J" );
	}

	@Test
	@DisplayName( "an override replaces the keys of that action only" )
	void overrides() {
		KeyMap map = KeyMap.of( Map.of( "newline", List.of( "ctrl+n" ), "stop", "ctrl+x" ) );
		assertThat( map.problems() ).isEmpty();
		assertThat( map.is( Action.NEWLINE, KeyEvent.ofChar( 'n', KeyModifiers.CTRL ) ) ).isTrue();
		assertThat( map.is( Action.NEWLINE, KeyEvent.ofChar( 'j', KeyModifiers.CTRL ) ) ).isFalse();
		assertThat( map.is( Action.STOP, KeyEvent.ofChar( 'x', KeyModifiers.CTRL ) ) ).isTrue();
		assertThat( map.is( Action.STOP, KeyEvent.ofKey( KeyCode.ESCAPE ) ) ).isFalse();
		assertThat( map.is( Action.SUBMIT, KeyEvent.ofKey( KeyCode.ENTER ) ) ).isTrue();
	}

	@Test
	@DisplayName( "a bad entry is reported and the action keeps its defaults" )
	void problems() {
		KeyMap map = KeyMap.of( Map.of( "nope", List.of( "ctrl+k" ), "newline", List.of( "banana" ), "clear", List.of( "ctrl+u" ), "exit", List.of() ) );
		assertThat( map.problems() ).hasSize( 4 );
		assertThat( map.problems().toString() ).contains( "no key action [nope]" );
		assertThat( map.problems().toString() ).contains( "[banana] is not a key I can read" );
		assertThat( map.problems().toString() ).contains( "Ctrl+U is already used by [deleteToStart]" );
		assertThat( map.problems().toString() ).contains( "[exit] needs at least one key" );
		assertThat( map.is( Action.NEWLINE, KeyEvent.ofChar( 'j', KeyModifiers.CTRL ) ) ).isTrue();
		assertThat( map.is( Action.CLEAR, KeyEvent.ofChar( 'c', KeyModifiers.CTRL ) ) ).isTrue();
	}

	@Test
	@DisplayName( "the same key may serve the box and the run, as ctrl+c does" )
	void samePlaces() {
		assertThat( KeyMap.of( Map.of( "stop", List.of( "ctrl+u" ) ) ).problems() ).isEmpty();
	}

	@Test
	@DisplayName( "a plain letter is typing, not a binding" )
	void plainLetter() {
		assertThat( KeyMap.of( Map.of( "newline", List.of( "j" ) ) ).problems() ).hasSize( 1 );
	}

	@Test
	@DisplayName( "the composer follows the map: a rebound newline key adds a line" )
	void composerFollows() {
		Composer c = new Composer();
		c.keys( KeyMap.of( Map.of( "newline", List.of( "ctrl+n" ) ) ) );
		c.key( KeyEvent.ofChar( 'a' ) );
		c.key( KeyEvent.ofChar( 'n', KeyModifiers.CTRL ) );
		c.key( KeyEvent.ofChar( 'b' ) );
		assertThat( c.text() ).isEqualTo( "a\nb" );
		c.key( KeyEvent.ofChar( 'j', KeyModifiers.CTRL ) );
		assertThat( c.text() ).isEqualTo( "a\nb" );
	}

	@Test
	@DisplayName( "the table lists every action once" )
	void table() {
		assertThat( KeyMap.defaults().table() ).hasSize( Action.values().length );
		assertThat( KeyMap.defaults().table().get( 0 ) ).containsEntry( "id", "submit" );
	}
}
