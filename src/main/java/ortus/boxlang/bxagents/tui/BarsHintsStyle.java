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

/** The same two bars, with the hints and the bottom widgets inside the lower one, so there is no hint row. */
public final class BarsHintsStyle extends AbstractPromptStyle {

	public BarsHintsStyle() {
		super( "bars-hints", "bars with the hints inside the lower bar" );
	}

	@Override
	public List<Row> rows( PromptState state, Theme theme ) {
		Style		tone	= tone( state, theme );
		List<Row>	rows	= new ArrayList<>();
		rows.add( topBar( state, theme, "── ", "" ) );
		for ( int i = 0; i < state.lines().size(); i++ ) {
			rows.add( inputRow( Row.of(), state, i, state.width(), tone, theme, " " + MARK + " " ) );
		}
		rows.add( hintBar( state, theme, "──", "──" ) );
		return rows;
	}
}
