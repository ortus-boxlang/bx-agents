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
 * Yes or no. y/n answer at once, Left/Right/Tab switch, Enter takes the
 * highlighted answer.
 */
final class ConfirmPrompt extends Prompt {

	private boolean yes;

	ConfirmPrompt( Theme theme, String title, String help, boolean fallback ) {
		super( theme, title, help );
		this.yes = fallback;
	}

	@Override
	void key( KeyEvent key ) {
		abortKeys( key );
		if ( key.isChar( 'y' ) || key.isChar( 'Y' ) ) {
			finish( Boolean.TRUE );
			yes = true;
		} else if ( key.isChar( 'n' ) || key.isChar( 'N' ) ) {
			finish( Boolean.FALSE );
			yes = false;
		} else if ( key.isKey( KeyCode.LEFT ) || key.isKey( KeyCode.RIGHT ) || key.isKey( KeyCode.TAB ) ) {
			yes = !yes;
		} else if ( key.isKey( KeyCode.ENTER ) ) {
			finish( yes );
		}
	}

	@Override
	List<Row> render( int width, int height ) {
		List<Row> rows = new ArrayList<>();
		rows.add( titleRow() );
		if ( !help.isEmpty() ) {
			rows.add( helpRow() );
		}
		rows.add( Row.of().add( "    ", theme.plain ).add( yes ? "[ Yes ]" : "  Yes  ", yes ? theme.selected : theme.muted ).add( "  ", theme.plain )
		    .add( yes ? "  No  " : "[ No ]", yes ? theme.muted : theme.selected ) );
		return rows;
	}

	@Override
	String footer() {
		return "y yes   n no   ←→ switch   enter confirm   esc back";
	}


}
