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

import dev.tamboui.tui.event.KeyCode;
import dev.tamboui.tui.event.KeyEvent;

/**
 * Text the user reads and dismisses with Enter: warnings, setup steps.
 */
final class NotePrompt extends Prompt {

	private final List<String> lines;

	NotePrompt( Theme theme, String title, List<String> lines ) {
		super( theme, title, "" );
		this.lines = lines;
	}

	@Override
	void key( KeyEvent key ) {
		abortKeys( key );
		if ( key.isKey( KeyCode.ENTER ) ) {
			finish( Boolean.TRUE );
		}
	}

	@Override
	List<Row> render( int width, int height ) {
		List<Row> rows = new ArrayList<>();
		rows.add( Row.of().add( "! ", theme.warn ).add( title, theme.bold ) );
		for ( String l : lines ) {
			rows.add( Row.of( "  " + l, theme.plain ) );
		}
		return rows;
	}

	@Override
	String footer() {
		return "enter continue   esc back";
	}


}
