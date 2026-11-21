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

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import dev.tamboui.tui.event.KeyCode;
import dev.tamboui.tui.event.KeyEvent;

@DisplayName( "SettingsPanel" )
class SettingsPanelTest {

	/**
	 * A panel over the defaults, with an agent file and a file for every agent
	 *
	 * @param agreed the files already agreed to
	 *
	 * @return the panel
	 */
	private static SettingsPanel panel( Set<Boolean> agreed ) {
		return new SettingsPanel( TuiSettings.defaults(), "/home/me/.bxagents/bot/settings.yml", "/home/me/.bxagents/bxAgents.yml", agreed );
	}

	/**
	 * Press a key that is not a character
	 *
	 * @param panel the panel
	 * @param code  the key
	 *
	 * @return what the panel asks for
	 */
	private static SettingsPanel.Outcome press( SettingsPanel panel, KeyCode code ) {
		return panel.key( KeyEvent.ofKey( code ) );
	}

	/**
	 * Press a character
	 *
	 * @param panel the panel
	 * @param c     the character
	 *
	 * @return what the panel asks for
	 */
	private static SettingsPanel.Outcome press( SettingsPanel panel, char c ) {
		return panel.key( KeyEvent.ofChar( c ) );
	}

	@Test
	@DisplayName( "the first change to a file is asked about, a yes saves it, and the next change to that file is saved at once" )
	void asksOnce() {
		SettingsPanel panel = panel( new HashSet<>() );
		assertThat( press( panel, KeyCode.RIGHT ) ).isEqualTo( SettingsPanel.Outcome.NONE );
		assertThat( String.join( "\n", panel.rows( Theme.detect(), 100, 30 ).stream().map( Row::plainText ).toList() ) )
		    .contains( "Save to /home/me/.bxagents/bot/settings.yml?" );
		assertThat( press( panel, KeyCode.ENTER ) ).isEqualTo( SettingsPanel.Outcome.CHANGE );
		SettingsPanel.Change change = panel.pending();
		assertThat( change.setting().name() ).isEqualTo( "fullscreen" );
		assertThat( change.value() ).isEqualTo( "false" );
		assertThat( change.global() ).isFalse();
		assertThat( panel.pending() ).isNull();
		assertThat( press( panel, KeyCode.LEFT ) ).isEqualTo( SettingsPanel.Outcome.CHANGE );
		assertThat( panel.pending().value() ).isEqualTo( "false" );
	}

	@Test
	@DisplayName( "Esc on the question saves nothing and keeps the panel open, and Esc again closes it" )
	void declining() {
		SettingsPanel panel = panel( new HashSet<>() );
		press( panel, KeyCode.RIGHT );
		assertThat( press( panel, KeyCode.ESCAPE ) ).isEqualTo( SettingsPanel.Outcome.NONE );
		assertThat( panel.pending() ).isNull();
		assertThat( String.join( "\n", panel.rows( Theme.detect(), 100, 30 ).stream().map( Row::plainText ).toList() ) ).contains( "Nothing was saved." );
		assertThat( press( panel, KeyCode.ESCAPE ) ).isEqualTo( SettingsPanel.Outcome.CLOSE );
	}

	@Test
	@DisplayName( "g switches between this agent and every agent, each file being agreed to on its own, and the files are named" )
	void scopes() {
		Set<Boolean>	agreed	= new HashSet<>( Set.of( false ) );
		SettingsPanel	panel	= panel( agreed );
		assertThat( press( panel, KeyCode.RIGHT ) ).isEqualTo( SettingsPanel.Outcome.CHANGE );
		assertThat( panel.pending().global() ).isFalse();
		press( panel, 'g' );
		assertThat( press( panel, KeyCode.RIGHT ) ).isEqualTo( SettingsPanel.Outcome.NONE );
		assertThat( String.join( "\n", panel.rows( Theme.detect(), 100, 30 ).stream().map( Row::plainText ).toList() ) )
		    .contains( "saves for every agent  in /home/me/.bxagents/bxAgents.yml" );
		assertThat( press( panel, KeyCode.ENTER ) ).isEqualTo( SettingsPanel.Outcome.CHANGE );
		assertThat( panel.pending().global() ).isTrue();
		assertThat( agreed ).containsExactly( false, true );
	}

	@Test
	@DisplayName( "r asks to take the picked setting out, and a chat with no agent file only saves for every agent" )
	void resetAndNoAgentFile() {
		SettingsPanel panel = panel( new HashSet<>( Set.of( false ) ) );
		assertThat( press( panel, 'r' ) ).isEqualTo( SettingsPanel.Outcome.RESET );
		assertThat( panel.pending().value() ).isNull();
		SettingsPanel remote = new SettingsPanel( TuiSettings.defaults(), "", "/home/me/.bxagents/bxAgents.yml", new HashSet<>() );
		assertThat( String.join( "\n", remote.rows( Theme.detect(), 100, 30 ).stream().map( Row::plainText ).toList() ) ).contains( "saves for every agent" );
		press( remote, 'g' );
		assertThat( String.join( "\n", remote.rows( Theme.detect(), 100, 30 ).stream().map( Row::plainText ).toList() ) )
		    .contains( "There is no agent file here" );
	}

	@Test
	@DisplayName( "Up and Down wrap round the list, words go through their choices and wrap, numbers stop at their ends" )
	void changingValues() {
		SettingsPanel panel = panel( new HashSet<>( Set.of( false ) ) );
		press( panel, KeyCode.UP );
		press( panel, KeyCode.UP );
		// the setting before the last is notify: off, bell, system
		press( panel, KeyCode.RIGHT );
		SettingsPanel.Change change = panel.pending();
		assertThat( change.setting().name() ).isEqualTo( "notify" );
		assertThat( change.value() ).isEqualTo( "bell" );
		press( panel, KeyCode.LEFT );
		assertThat( panel.pending().value() ).isEqualTo( "system" );
		// menuRows: 8, the least is 3
		TuiSettings.Resolved	low		= TuiSettings.resolve( List.of( new TuiSettings.Layer( "x", java.util.Map.of( "menuRows", 3 ) ) ) );
		SettingsPanel			rows	= new SettingsPanel( low, "/a", "/b", new HashSet<>( Set.of( false ) ) );
		for ( int i = 0; i < 8; i++ ) {
			press( rows, KeyCode.DOWN );
		}
		press( rows, KeyCode.LEFT );
		SettingsPanel.Change least = rows.pending();
		assertThat( least.setting().name() ).isEqualTo( "menuRows" );
		assertThat( least.value() ).isEqualTo( "3" );
	}

	@Test
	@DisplayName( "the rows are a rule above and below and a bar down the left, with every setting listed, none wider than the screen" )
	void shape() {
		List<String> rows = panel( new HashSet<>() ).rows( Theme.detect(), 80, 30 ).stream().map( Row::plainText ).toList();
		assertThat( rows.get( 0 ) ).startsWith( "── Settings " );
		assertThat( rows.get( rows.size() - 1 ) ).isEqualTo( "─".repeat( 80 ) );
		assertThat( rows.subList( 1, rows.size() - 1 ).stream().allMatch( r -> r.startsWith( "▎ " ) ) ).isTrue();
		assertThat( rows.stream().allMatch( r -> r.length() <= 80 ) ).isTrue();
		String all = String.join( "\n", rows );
		for ( TuiSettings.Setting s : TuiSettings.ALL ) {
			assertThat( all ).contains( s.name() );
		}
		assertThat( all ).contains( "next start" );
	}

	@Test
	@DisplayName( "after a change the panel shows the new value and the layer it came from, and the line about what happened" )
	void refreshing() {
		SettingsPanel			panel	= panel( new HashSet<>() );
		TuiSettings.Resolved	changed	= TuiSettings.defaults().with( TuiSettings.AGENT, "fullscreen", "false" );
		panel.refresh( changed, "Saved fullscreen: false for this agent." );
		String all = String.join( "\n", panel.rows( Theme.detect(), 100, 30 ).stream().map( Row::plainText ).toList() );
		assertThat( all ).contains( "fullscreen     false     this agent" );
		assertThat( all ).contains( "Saved fullscreen: false for this agent." );
	}

}
