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

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import dev.tamboui.tui.event.KeyCode;
import dev.tamboui.tui.event.KeyEvent;

/**
 * The settings of the chat as a panel in the live area: every setting with its value and the place the value comes from, one picked, changed
 * with the arrow keys, saved for this agent or for every agent. Drawn like the other panels, with a rule above and below and a bar down the
 * left. It draws nothing itself and reads no terminal: {@link ChatScreen} gives it keys, writes what it asks for, and draws the rows.
 */
final class SettingsPanel {

	/**
	 * What a key did that the screen must act on
	 */
	enum Outcome {

		/**
		 * Nothing for the screen to do
		 */
		NONE,

		/**
		 * The panel should close
		 */
		CLOSE,

		/**
		 * A value should be saved, see {@link #pending()}
		 */
		CHANGE,

		/**
		 * A value should be taken out of the file, see {@link #pending()}
		 */
		RESET
	}

	/**
	 * A change the screen is asked to save
	 *
	 * @param setting the setting
	 * @param value   the new value as text, null for a reset
	 * @param global  true to save for every agent, false for this agent
	 */
	record Change( TuiSettings.Setting setting, String value, boolean global ) {
	}

	/**
	 * The settings that take effect only when the chat opens again
	 */
	private static final Set<String>	NEXT_START	= Set.of( "fullscreen", "header" );

	/**
	 * The settings as decided now
	 */
	private TuiSettings.Resolved		resolved;

	/**
	 * The agent's own settings file, empty when there is none
	 */
	private final String				agentFile;

	/**
	 * The person's file for every agent
	 */
	private final String				userFile;

	/**
	 * Which setting is picked
	 */
	private int							pick;

	/**
	 * True when a change is saved for every agent, false for this agent
	 */
	private boolean						global;

	/**
	 * The change that waits for a yes, because nothing was written to that file in this chat yet
	 */
	private Change						asking;

	/**
	 * The change a key asked for, for {@link #pending()}
	 */
	private Change						pending;

	/**
	 * The files already agreed to in this chat, so the person is asked once for each
	 */
	private final Set<Boolean>			agreed;

	/**
	 * A line about what just happened, shown under the list
	 */
	private String						message		= "";

	/**
	 * @param resolved  the settings as decided now
	 * @param agentFile the agent's own settings file, empty when there is none (a chat with a server somewhere else)
	 * @param userFile  the person's file for every agent
	 * @param agreed    the files already agreed to in this chat ({@code false} for the agent's, {@code true} for the person's), kept by the screen
	 */
	SettingsPanel( TuiSettings.Resolved resolved, String agentFile, String userFile, Set<Boolean> agreed ) {
		this.resolved	= resolved;
		this.agentFile	= agentFile == null ? "" : agentFile;
		this.userFile	= userFile == null ? "" : userFile;
		this.agreed		= agreed;
		this.global		= this.agentFile.isEmpty();
	}

	/**
	 * Take the settings as they are after a change, and say what happened
	 *
	 * @param now  the settings now
	 * @param said a line about the change
	 */
	void refresh( TuiSettings.Resolved now, String said ) {
		this.resolved	= now;
		this.message	= said == null ? "" : said;
	}

	/**
	 * @return the change the last key asked for, once, when it returned {@link Outcome#CHANGE} or {@link Outcome#RESET}
	 */
	Change pending() {
		Change c = pending;
		pending = null;
		return c;
	}

	/**
	 * @return the file a change is written to now
	 */
	private String target() {
		return global ? userFile : agentFile;
	}

	/**
	 * Take a key
	 *
	 * @param k the key
	 *
	 * @return what the screen must do
	 */
	Outcome key( KeyEvent k ) {
		if ( asking != null ) {
			if ( k.isKey( KeyCode.ENTER ) ) {
				agreed.add( asking.global() );
				pending	= asking;
				asking	= null;
				return pending.value() == null ? Outcome.RESET : Outcome.CHANGE;
			}
			if ( k.isKey( KeyCode.ESCAPE ) || k.isKey( KeyCode.CHAR ) && k.isChar( 'n' ) ) {
				asking	= null;
				message	= "Nothing was saved.";
			}
			return Outcome.NONE;
		}
		if ( k.isKey( KeyCode.ESCAPE ) || k.isKey( KeyCode.F1 ) ) {
			return Outcome.CLOSE;
		}
		int n = TuiSettings.ALL.size();
		if ( k.isKey( KeyCode.UP ) ) {
			pick = Math.floorMod( pick - 1, n );
		} else if ( k.isKey( KeyCode.DOWN ) ) {
			pick = Math.floorMod( pick + 1, n );
		} else if ( k.isKey( KeyCode.LEFT ) ) {
			return change( -1 );
		} else if ( k.isKey( KeyCode.RIGHT ) || k.isKey( KeyCode.ENTER ) || k.isKey( KeyCode.CHAR ) && k.isChar( ' ' ) ) {
			return change( 1 );
		} else if ( k.isKey( KeyCode.CHAR ) && k.isChar( 'g' ) ) {
			if ( agentFile.isEmpty() ) {
				message = "There is no agent file here, so a change is saved for every agent.";
			} else {
				global	= !global;
				message	= "";
			}
		} else if ( k.isKey( KeyCode.CHAR ) && k.isChar( 'r' ) ) {
			return ask( new Change( TuiSettings.ALL.get( pick ), null, global ) );
		}
		return Outcome.NONE;
	}

	/**
	 * Ask for the next or the previous value of the picked setting
	 *
	 * @param step 1 for the next, -1 for the previous
	 *
	 * @return what the screen must do
	 */
	private Outcome change( int step ) {
		TuiSettings.Setting	s	= TuiSettings.ALL.get( pick );
		List<String>		all	= options( s );
		int					at	= all.indexOf( resolved.get( s.name() ) );
		String				next;
		if ( s.kind() == TuiSettings.Kind.INT ) {
			int now = Integer.parseInt( resolved.get( s.name() ) );
			next = String.valueOf( Math.max( s.min(), Math.min( s.max(), now + step ) ) );
		} else {
			next = all.get( Math.floorMod( at + step, all.size() ) );
		}
		return ask( new Change( s, next, global ) );
	}

	/**
	 * Save at once when the file was agreed to, or ask first
	 *
	 * @param change the change
	 *
	 * @return what the screen must do
	 */
	private Outcome ask( Change change ) {
		if ( target().isEmpty() ) {
			message = "There is no file to save to here.";
			return Outcome.NONE;
		}
		if ( agreed.contains( change.global() ) ) {
			pending = change;
			return change.value() == null ? Outcome.RESET : Outcome.CHANGE;
		}
		asking = change;
		return Outcome.NONE;
	}

	/**
	 * @param s a setting
	 *
	 * @return the values to go through: {@code true} and {@code false}, the words, or none for a number
	 */
	static List<String> options( TuiSettings.Setting s ) {
		return switch ( s.kind() ) {
			case BOOL -> List.of( "true", "false" );
			case CHOICE -> s.choices();
			default -> List.of();
		};
	}

	/**
	 * The panel as rows: the title, where a change is saved, a line for each setting, what the picked one is and does, a line for a question
	 * or what just happened, the keys, and a rule
	 *
	 * @param theme  the palette
	 * @param width  the width of the screen
	 * @param height how many rows the panel may take
	 *
	 * @return the rows, none wider than the screen
	 */
	List<Row> rows( Theme theme, int width, int height ) {
		List<Row>	out		= new ArrayList<>();
		String		title	= "Settings";
		out.add(
		    Row.of().add( "── ", theme.accent ).add( title, theme.bold ).add( " " + "─".repeat( Math.max( 0, width - title.length() - 4 ) ), theme.accent ) );
		out.add( barred( theme, width, Row.of().add( "saves for ", theme.muted ).add( global ? "every agent" : "this agent", theme.selected )
		    .add( "  in " + ( target().isEmpty() ? "no file" : target() ), theme.muted ) ) );
		int	nameCol	= 15;
		int	valCol	= 10;
		int	srcCol	= 11;
		for ( int i = 0; i < TuiSettings.ALL.size(); i++ ) {
			TuiSettings.Setting	s		= TuiSettings.ALL.get( i );
			boolean				on		= i == pick;
			String				value	= resolved.get( s.name() );
			String				source	= resolved.source( s.name() );
			Row					row		= Row.of().add( on ? "❯ " : "  ", theme.accent ).add( pad( s.name(), nameCol ), on ? theme.selected : theme.plain )
			    .add( pad( value, valCol ), on ? theme.selected : theme.accent )
			    .add( pad( source, srcCol ), "default".equals( source ) ? theme.muted : theme.ok )
			    .add( NEXT_START.contains( s.name() ) ? "next start" : "", theme.warn );
			out.add( barred( theme, width, row ) );
		}
		TuiSettings.Setting picked = TuiSettings.ALL.get( pick );
		out.add( barred( theme, width, Row.of() ) );
		List<String> said = Wrap.wrap( picked.does() + ".", Math.max( 20, width - 4 ) );
		for ( int i = 0; i < Math.min( 2, said.size() ); i++ ) {
			out.add( barred( theme, width, Row.of( said.get( i ), theme.plain ) ) );
		}
		out.add( barred( theme, width, Row.of( "Takes " + picked.allowed() + ". The default is " + picked.def() + ".", theme.muted ) ) );
		if ( asking != null ) {
			String file = asking.global() ? userFile : agentFile;
			out.add( barred( theme, width,
			    Row.of().add( ( asking.value() == null ? "Take " + asking.setting().name() + " out of " : "Save to " ) + file + "?  ", theme.warn )
			        .add( "enter yes · esc no", theme.muted ) ) );
		} else {
			out.add( barred( theme, width, Row.of( message, theme.ok ) ) );
		}
		out.add( barred( theme, width, Row.of( "↑↓ choose · ←→ change · r reset to the layer below · g agent or every agent · esc closes", theme.muted ) ) );
		out.add( Row.of( "─".repeat( width ), theme.accent ) );
		return out;
	}

	/**
	 * @param text  a text
	 * @param width the width of its column
	 *
	 * @return the text padded with spaces to the width, and a space after it even when it is longer
	 */
	private static String pad( String text, int width ) {
		return text.length() >= width ? text + " " : text + " ".repeat( width - text.length() );
	}

	/**
	 * A row with the accent bar down its left side
	 *
	 * @param theme the palette
	 * @param width the width of the screen
	 * @param row   the content
	 *
	 * @return the row, cut to the width of the screen
	 */
	private static Row barred( Theme theme, int width, Row row ) {
		return Row.of().add( "▎ ", theme.accent ).addPadded( row, Math.max( 0, width - 2 ) );
	}

}
