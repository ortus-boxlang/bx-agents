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

@DisplayName( "KeysPanel" )
class KeysPanelTest {

	/**
	 * A panel over the default keys
	 *
	 * @return The panel
	 */
	private static KeysPanel panel() {
		return new KeysPanel( KeyMap.defaults().table() );
	}

	/**
	 * Type a word into the panel
	 *
	 * @param panel The panel
	 * @param word  What to type
	 */
	private static void type( KeysPanel panel, String word ) {
		for ( char c : word.toCharArray() ) {
			panel.key( KeyEvent.ofChar( c ) );
		}
	}

	/**
	 * The text of the rows
	 *
	 * @param panel  The panel
	 * @param height How many rows it may take
	 *
	 * @return One string per row
	 */
	private static List<String> text( KeysPanel panel, int height ) {
		return panel.rows( Theme.detect(), 100, height ).stream().map( Row::plainText ).toList();
	}

	@Test
	@DisplayName( "it lists the shortcuts under their headings, the actions of the key map and the menus, prefixes and the panel's own" )
	void sections() {
		KeysPanel		panel		= panel();
		List<String>	all			= text( panel, 80 );
		List<String>	headings	= all.stream().filter( l -> l.length() > 2 && KeysPanel.SECTIONS.contains( l.substring( 2 ).strip() ) )
		    .map( l -> l.substring( 2 ).strip() ).toList();
		assertThat( headings )
		    .containsExactly( "Writing a message", "Menus", "While the agent works", "Prefixes", "This panel" ).inOrder();
		assertThat( String.join( "\n", all ) ).contains( "Send the message" );
		assertThat( String.join( "\n", all ) ).contains( "Esc, Ctrl+C" );
		assertThat( String.join( "\n", all ) ).contains( "Steer: your message is added to the run" );
		assertThat( String.join( "\n", all ) ).contains( "F1, Ctrl+/, ?" );
	}

	@Test
	@DisplayName( "typing narrows the list by keys, by what they do and by heading, and Backspace widens it again" )
	void filtering() {
		KeysPanel	panel	= panel();
		int			all		= panel.shown().size();
		type( panel, "ctrl" );
		assertThat( panel.shown().size() ).isLessThan( all );
		assertThat( panel.shown().stream().allMatch( e -> e.keys().toLowerCase().contains( "ctrl" ) || e.does().toLowerCase().contains( "ctrl" ) ) ).isTrue();
		panel.key( KeyEvent.ofKey( KeyCode.BACKSPACE ) );
		assertThat( panel.filter() ).isEqualTo( "ctr" );
		panel.key( KeyEvent.ofKey( KeyCode.ESCAPE ) );
		assertThat( panel.filter() ).isEmpty();
		assertThat( panel.shown() ).hasSize( all );
		type( panel, "prefixes" );
		assertThat( panel.shown().stream().map( KeysPanel.Entry::section ).distinct().toList() ).containsExactly( "Prefixes" );
		type( panel, "zzzz" );
		assertThat( panel.shown() ).isEmpty();
		assertThat( String.join( "\n", text( panel, 20 ) ) ).contains( "0 of " + panel.size() );
	}

	@Test
	@DisplayName( "Esc clears a filter first and closes the panel second; F1 and Ctrl+/ close it at once" )
	void closing() {
		KeysPanel panel = panel();
		type( panel, "tab" );
		assertThat( panel.key( KeyEvent.ofKey( KeyCode.ESCAPE ) ) ).isFalse();
		assertThat( panel.key( KeyEvent.ofKey( KeyCode.ESCAPE ) ) ).isTrue();
		type( panel, "tab" );
		assertThat( panel.key( KeyEvent.ofKey( KeyCode.F1 ) ) ).isTrue();
		assertThat( panel.key( KeyEvent.ofChar( '/', KeyModifiers.CTRL ) ) ).isTrue();
		assertThat( panel.key( KeyEvent.ofChar( 'x' ) ) ).isFalse();
	}

	@Test
	@DisplayName( "it scrolls with the arrow keys and pages, never past the first or the last line" )
	void scrolling() {
		KeysPanel		panel	= panel();
		List<String>	first	= text( panel, 10 );
		assertThat( first.get( 2 ) ).contains( "Writing a message" );
		panel.key( KeyEvent.ofKey( KeyCode.UP ) );
		assertThat( text( panel, 10 ) ).isEqualTo( first );
		panel.key( KeyEvent.ofKey( KeyCode.DOWN ) );
		assertThat( text( panel, 10 ).get( 2 ) ).doesNotContain( "Writing a message" );
		for ( int i = 0; i < 100; i++ ) {
			panel.key( KeyEvent.ofKey( KeyCode.PAGE_DOWN ) );
		}
		List<String> last = text( panel, 10 );
		assertThat( String.join( "\n", last ) ).contains( "bxAgents.yml" );
		panel.key( KeyEvent.ofKey( KeyCode.DOWN ) );
		assertThat( text( panel, 10 ) ).isEqualTo( last );
	}

	@Test
	@DisplayName( "the rows are a rule above and below and a bar down the left, none wider than the screen, so the panel needs no side borders" )
	void shape() {
		KeysPanel		panel	= panel();
		List<String>	rows	= panel.rows( Theme.detect(), 80, 14 ).stream().map( Row::plainText ).toList();
		assertThat( rows ).hasSize( 14 );
		assertThat( rows.get( 0 ) ).startsWith( "── Keyboard shortcuts " );
		assertThat( rows.get( 13 ) ).isEqualTo( "─".repeat( 80 ) );
		assertThat( rows.subList( 1, 13 ).stream().allMatch( r -> r.startsWith( "▎ " ) ) ).isTrue();
		assertThat( rows.stream().allMatch( r -> r.length() <= 80 ) ).isTrue();
	}

	@Test
	@DisplayName( "a key the person changed shows what it was" )
	void changedKeys() {
		KeyMap		map		= KeyMap.of( Map.of( "newline", List.of( "ctrl+n" ) ) );
		KeysPanel	panel	= new KeysPanel( map.table() );
		assertThat( String.join( "\n", text( panel, 80 ) ) ).contains( "Ctrl+N" );
		assertThat( String.join( "\n", text( panel, 80 ) ) ).contains( "(was Alt+Enter, Shift+Enter, Ctrl+J)" );
		assertThat( String.join( "\n", text( panel(), 80 ) ) ).doesNotContain( "(was " );
	}

	@Test
	@DisplayName( "each action shows the name to use for it in bxAgents.yml, and the filter finds it by that name" )
	void actionNames() {
		KeysPanel panel = panel();
		assertThat( String.join( "\n", text( panel, 80 ) ) ).contains( "Send the message  submit" );
		type( panel, "newline" );
		assertThat( panel.shown().stream().map( KeysPanel.Entry::id ).toList() ).containsExactly( "newline" );
	}

	@Test
	@DisplayName( "the keys an extension adds are listed under Extensions" )
	void extensionKeys() {
		KeyMap map = KeyMap.of( Map.of(), List.of( new KeyMap.Extra( "greet", "Say hello", List.of( "ctrl+g" ) ) ) );
		assertThat( String.join( "\n", text( new KeysPanel( map.table() ), 80 ) ) ).contains( "Extensions" );
		assertThat( String.join( "\n", text( new KeysPanel( map.table() ), 80 ) ) ).contains( "Say hello" );
	}

}
