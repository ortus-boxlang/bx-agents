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
import java.util.Map;

/**
 * The look the user chose for the prompt: the style and which widgets sit where. Immutable; a change makes a new one.
 * Built from the {@code tui:} block of {@code Agent.yaml}, where a name that is not known is left out rather than
 * failing, because the build has already refused it.
 *
 * @param style  a {@link PromptStyles} name
 * @param top    {@link Widgets} names for the top bar
 * @param bottom {@link Widgets} names for the bottom bar or hint row
 */
public record PromptLook( String style, List<String> top, List<String> bottom ) {

	/** the widgets in the top bar when nothing says otherwise */
	public static final List<String>	DEFAULT_TOP		= List.of( "agent", "folder", "user", "clock" );
	/** the widgets at the bottom when nothing says otherwise */
	public static final List<String>	DEFAULT_BOTTOM	= List.of( "ctx", "profile" );

	public PromptLook {
		top		= List.copyOf( top );
		bottom	= List.copyOf( bottom );
	}

	/** @return the look a project gets with no {@code tui:} block */
	public static PromptLook defaults() {
		return new PromptLook( PromptStyles.DEFAULT, DEFAULT_TOP, DEFAULT_BOTTOM );
	}

	/**
	 * @param tui a map with {@code prompt} and {@code widgets} ({@code top} and {@code bottom} lists), any of them missing
	 *
	 * @return the look, with the defaults for what is missing and unknown names dropped
	 */
	public static PromptLook of( Map<?, ?> tui ) {
		PromptLook	base	= defaults();
		if ( tui == null ) {
			return base;
		}
		Object		prompt	= tui.get( "prompt" );
		String		style	= prompt != null && PromptStyles.get( String.valueOf( prompt ) ) != null ? String.valueOf( prompt ).trim().toLowerCase() : base.style;
		Object		widgets	= tui.get( "widgets" );
		List<String> top	= base.top;
		List<String> bottom	= base.bottom;
		if ( widgets instanceof Map<?, ?> w ) {
			top		= w.containsKey( "top" ) ? known( w.get( "top" ) ) : top;
			bottom	= w.containsKey( "bottom" ) ? known( w.get( "bottom" ) ) : bottom;
		}
		return new PromptLook( style, top, bottom );
	}

	/** @return this look with another style */
	public PromptLook withStyle( String name ) {
		return new PromptLook( name, top, bottom );
	}

	/** @return this look with other widgets in the top bar */
	public PromptLook withTop( List<String> names ) {
		return new PromptLook( style, names, bottom );
	}

	/** @return this look with other widgets at the bottom */
	public PromptLook withBottom( List<String> names ) {
		return new PromptLook( style, top, names );
	}

	private static List<String> known( Object list ) {
		List<String> out = new ArrayList<>();
		if ( list instanceof Iterable<?> items ) {
			for ( Object item : items ) {
				String name = String.valueOf( item ).trim().toLowerCase();
				if ( Widgets.get( name ) != null && !out.contains( name ) ) {
					out.add( name );
				}
			}
		}
		return out;
	}
}
