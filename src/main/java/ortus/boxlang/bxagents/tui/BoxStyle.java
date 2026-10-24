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

/** A rounded box around the message box: the label and top widgets in its top edge, the hints in its bottom edge. */
public final class BoxStyle extends AbstractPromptStyle {

	public BoxStyle() {
		super( "box", "a full rounded box" );
	}

	@Override
	public List<Row> rows( PromptState state, Theme theme ) {
		Style		tone	= tone( state, theme );
		List<Row>	rows	= new ArrayList<>();
		rows.add( topBar( state, theme, "╭─ ", "╮" ) );
		for ( int i = 0; i < state.lines().size(); i++ ) {
			Row row = Row.of().add( "│", tone );
			inputRow( row, state, i, state.width() - 2, tone, theme, " " + MARK + " " );
			// pad to the right edge: the border is the last cell
			row.add( " ".repeat( Math.max( 0, state.width() - 1 - row.width() ) ), theme.plain ).add( "│", tone );
			rows.add( row );
		}
		rows.add( hintBar( state, theme, "╰─", "─╯" ) );
		return rows;
	}
}
