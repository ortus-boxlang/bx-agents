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

import dev.tamboui.style.Style;

/** A bar above the message box and a bar below it, like Pi; the hints and widgets sit under the lower bar. */
public final class BarsStyle extends AbstractPromptStyle {

	public BarsStyle() {
		super( "bars", "top and bottom bars, like Pi (the default)" );
	}

	@Override
	public List<Row> rows( PromptState state, Theme theme ) {
		Style		tone	= tone( state, theme );
		List<Row>	rows	= new ArrayList<>();
		rows.add( topBar( state, theme, "── ", "" ) );
		for ( int i = 0; i < state.lines().size(); i++ ) {
			rows.add( inputRow( Row.of(), state, i, state.width(), tone, theme, " " + MARK + " " ) );
		}
		rows.add( rule( state, theme ) );
		rows.add( hintRow( state, theme ) );
		return rows;
	}
}
