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

/**
 * A tinted panel with a thick bar down its left side. It needs a background colour, so on a terminal without
 * colour it is drawn as the {@code rule} style.
 */
public final class PanelStyle extends AbstractPromptStyle {

	private final PromptStyle fallback = new RuleStyle();

	public PanelStyle() {
		super( "panel", "a tinted panel with a left bar" );
	}

	@Override
	public List<Row> rows( PromptState state, Theme theme ) {
		if ( !theme.hasPanel() ) {
			return fallback.rows( state, theme );
		}
		Style		tone	= theme.onPanel( tone( state, theme ) );
		Style		muted	= theme.onPanel( theme.muted );
		Style		plain	= theme.onPanel( theme.plain );
		int			width	= state.width();
		List<Row>	rows	= new ArrayList<>();

		String		lead	= state.working() ? state.label() : "";
		List<String> shown	= fit( state.top(), width - 6 - lead.length(), " · " );
		String		head	= " " + String.join( " · ", lead.isEmpty() ? shown : prepend( lead, shown ) );
		rows.add( Row.of().add( "▌", tone ).add( pad( head, width - 1 ), muted ) );
		for ( int i = 0; i < state.lines().size(); i++ ) {
			Row row = Row.of().add( "▌", tone );
			inputRow( row, state, i, width, tone, theme, " " + MARK + " ", theme::onPanel );
			rows.add( row.add( " ".repeat( Math.max( 0, width - row.width() ) ), plain ) );
		}
		rows.add( Row.of().add( "▌", tone ).add( " ".repeat( width - 1 ), plain ) );
		rows.add( hintRow( state, theme ) );
		return rows;
	}

	private static List<String> prepend( String first, List<String> rest ) {
		List<String> all = new ArrayList<>();
		all.add( first );
		all.addAll( rest );
		return all;
	}

	private static String pad( String s, int n ) {
		return s.length() >= n ? s.substring( 0, n ) : s + " ".repeat( n - s.length() );
	}
}
