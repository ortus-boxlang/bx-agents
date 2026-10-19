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

import java.util.List;

import dev.tamboui.tui.event.KeyEvent;

/**
 * One question on screen. It owns its own state and key handling and
 * describes itself as {@link Row}s; {@link TuiScreen} owns the terminal.
 * Splitting it this way keeps every prompt testable with no terminal.
 */
abstract class Prompt {

	protected final Theme	theme;
	protected final String	title;
	protected final String	help;
	private boolean			done;
	private Object			result;

	Prompt( Theme theme, String title, String help ) {
		this.theme	= theme;
		this.title	= title;
		this.help	= help == null ? "" : help;
	}

	/** Handles one key; throws {@link PromptAbort} for Esc and Ctrl+C. */
	abstract void key( KeyEvent key );

	/**
	 * @param width  columns available
	 * @param height rows available for this prompt
	 *
	 * @return the rows to show, title first
	 */
	abstract List<Row> render( int width, int height );

	/** @return the key hints for the footer line */
	abstract String footer();

	final boolean isDone() {
		return done;
	}

	final Object result() {
		return result;
	}

	protected final void finish( Object value ) {
		this.result	= value;
		this.done	= true;
	}

	protected final Row titleRow() {
		return Row.of().add( "? ", theme.accentBold ).add( title, theme.bold );
	}

	protected final Row helpRow() {
		return Row.of( "  " + help, theme.muted );
	}

	/** Esc and Ctrl+C, shared by every prompt. */
	protected final boolean abortKeys( KeyEvent key ) {
		if ( key.isCtrlC() ) {
			throw new PromptAbort( PromptAbort.CANCEL );
		}
		if ( key.isKey( dev.tamboui.tui.event.KeyCode.ESCAPE ) ) {
			throw new PromptAbort( PromptAbort.BACK );
		}
		return false;
	}

}
