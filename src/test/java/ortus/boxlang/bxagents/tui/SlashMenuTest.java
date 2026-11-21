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

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName( "SlashMenu" )
class SlashMenuTest {

	/**
	 * A command as the registry returns it
	 *
	 * @param name  The name with its slash
	 * @param hint  The hint
	 * @param usage What follows the name
	 * @param group The heading
	 *
	 * @return The map
	 */
	private static Map<?, ?> command( String name, String hint, String usage, String group ) {
		return Map.of( "name", name, "hint", hint, "usage", usage, "group", group );
	}

	/**
	 * A menu with a handful of commands in the order the registry lists them, which is not the order of the groups
	 *
	 * @return The menu
	 */
	private static SlashMenu menu() {
		return new SlashMenu( List.<Map<?, ?>>of( command( "/help", "show these commands", "", "Screen" ),
		    command( "/new", "start a new conversation", "", "Conversation" ), command( "/resume", "go back to one: /resume 2", "[n|id]", "Conversation" ),
		    command( "/sessions", "list your recent conversations: /sessions [text]", "[text]", "Conversation" ),
		    command( "/context", "how big the context is", "", "Model" ), command( "/tools", "list the agent's tools", "", "Agent" ),
		    Map.of( "name", "/ping", "hint", "check that the model answers" ), command( "/deploy", "ship it", "", "Release" ) ) );
	}

	/**
	 * The names in the window
	 *
	 * @param menu The menu
	 *
	 * @return The names, in order
	 */
	private static List<String> names( SlashMenu menu ) {
		List<String> names = new ArrayList<>();
		menu.window().forEach( i -> names.add( i.name() ) );
		return names;
	}

	@Test
	@DisplayName( "a slash alone lists every command by group: the known groups first, a command without one under Other, last" )
	void everythingGrouped() {
		SlashMenu menu = menu();
		menu.sync( "/", 1 );
		assertThat( menu.isOpen() ).isTrue();
		assertThat( menu.isGrouped() ).isTrue();
		assertThat( menu.size() ).isEqualTo( 8 );
		assertThat( names( menu ) ).containsExactly( "/new", "/resume", "/sessions", "/tools", "/context", "/help", "/deploy", "/ping" ).inOrder();
	}

	@Test
	@DisplayName( "names that start with what was typed come first, then names that contain it, then, from three characters on, descriptions that contain it" )
	void ranking() {
		SlashMenu menu = menu();
		menu.sync( "/s", 1 );
		assertThat( names( menu ) ).containsExactly( "/sessions", "/resume", "/tools" ).inOrder();
		assertThat( menu.isGrouped() ).isFalse();
		menu.sync( "/ctx", 1 );
		assertThat( menu.isOpen() ).isFalse();
		menu.sync( "/text", 1 );
		assertThat( names( menu ) ).containsExactly( "/context" );
		menu.sync( "/model", 1 );
		assertThat( names( menu ) ).containsExactly( "/ping" );
	}

	@Test
	@DisplayName( "the menu is for one line that starts with a slash and has no space yet" )
	void whenItOpens() {
		SlashMenu menu = menu();
		menu.sync( "hello", 1 );
		assertThat( menu.isOpen() ).isFalse();
		menu.sync( "/resume 2", 1 );
		assertThat( menu.isOpen() ).isFalse();
		menu.sync( "/new", 2 );
		assertThat( menu.isOpen() ).isFalse();
		menu.sync( "/new", 1 );
		assertThat( menu.isOpen() ).isTrue();
		menu.sync( "/zzz", 1 );
		assertThat( menu.isOpen() ).isFalse();
		assertThat( menu.picked() ).isNull();
	}

	@Test
	@DisplayName( "up and down move the pick and wrap, and the window scrolls to keep the pick in view" )
	void movingAndScrolling() {
		List<Map<?, ?>> many = new ArrayList<>();
		for ( int i = 1; i <= 20; i++ ) {
			many.add( command( "/c" + String.format( "%02d", i ), "command " + i, "", "Agent" ) );
		}
		SlashMenu menu = new SlashMenu( many );
		menu.sync( "/", 1 );
		assertThat( menu.window() ).hasSize( SlashMenu.WINDOW );
		assertThat( menu.position() ).isEqualTo( 1 );
		for ( int i = 0; i < SlashMenu.WINDOW; i++ ) {
			menu.move( 1 );
		}
		assertThat( menu.picked().name() ).isEqualTo( "/c09" );
		assertThat( menu.window().get( 0 ).name() ).isEqualTo( "/c02" );
		assertThat( menu.pickInWindow() ).isEqualTo( SlashMenu.WINDOW - 1 );
		menu.move( -1 );
		menu.move( -1 );
		assertThat( menu.window().get( 0 ).name() ).isEqualTo( "/c02" );
		// up from the first wraps to the last, and the window follows
		menu.sync( "/c", 1 );
		menu.move( -1 );
		assertThat( menu.picked().name() ).isEqualTo( "/c20" );
		assertThat( menu.position() ).isEqualTo( 20 );
		assertThat( menu.window().get( SlashMenu.WINDOW - 1 ).name() ).isEqualTo( "/c20" );
		menu.move( 1 );
		assertThat( menu.picked().name() ).isEqualTo( "/c01" );
		assertThat( menu.window().get( 0 ).name() ).isEqualTo( "/c01" );
	}

	@Test
	@DisplayName( "typing something else puts the pick back on the first match, and Esc closes the menu until then" )
	void pickResetsAndDismiss() {
		SlashMenu menu = menu();
		menu.sync( "/s", 1 );
		menu.move( 1 );
		assertThat( menu.picked().name() ).isEqualTo( "/resume" );
		menu.sync( "/se", 1 );
		assertThat( menu.picked().name() ).isEqualTo( "/sessions" );
		menu.dismiss();
		assertThat( menu.isOpen() ).isFalse();
		menu.sync( "/se", 1 );
		assertThat( menu.isOpen() ).isFalse();
		menu.sync( "/ses", 1 );
		assertThat( menu.isOpen() ).isTrue();
	}

	@Test
	@DisplayName( "a command that takes nothing runs at once, one that takes something is filled in with a space" )
	void fillAndRun() {
		SlashMenu menu = menu();
		menu.sync( "/ne", 1 );
		assertThat( menu.picked().runsAtOnce() ).isTrue();
		assertThat( menu.picked().fill() ).isEqualTo( "/new" );
		menu.sync( "/res", 1 );
		assertThat( menu.picked().runsAtOnce() ).isFalse();
		assertThat( menu.picked().fill() ).isEqualTo( "/resume " );
	}

	@Test
	@DisplayName( "the description is the hint up to its first colon, where the examples begin" )
	void description() {
		assertThat( SlashMenu.description( "go back to one: /resume 2, or /resume <id>" ) ).isEqualTo( "go back to one" );
		assertThat( SlashMenu.description( "show these commands" ) ).isEqualTo( "show these commands" );
		assertThat( SlashMenu.description( "" ) ).isEmpty();
	}

}
