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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * The prompt styles that can be chosen by name. The built-in ones are here; {@link #register} adds another.
 */
public final class PromptStyles {

	/** the style used when none is named */
	public static final String						DEFAULT	= "bars";

	private static final Map<String, PromptStyle>	STYLES	= new LinkedHashMap<>();

	static {
		register( new BarsStyle() );
		register( new BarsHintsStyle() );
		register( new RuleStyle() );
		register( new BoxStyle() );
		register( new PanelStyle() );
	}

	private PromptStyles() {
	}

	/** Makes a style available by its name; a style with the same name is replaced. */
	public static synchronized void register( PromptStyle style ) {
		STYLES.put( style.name().toLowerCase( Locale.ROOT ), style );
	}

	/**
	 * @param name a style name, in any case
	 *
	 * @return the style, or null when there is none of that name
	 */
	public static synchronized PromptStyle get( String name ) {
		return name == null ? null : STYLES.get( name.trim().toLowerCase( Locale.ROOT ) );
	}

	/** @return the style of that name, or the default one */
	public static PromptStyle getOrDefault( String name ) {
		PromptStyle style = get( name );
		return style != null ? style : get( DEFAULT );
	}

	/** @return the names, in the order they were registered */
	public static synchronized List<String> names() {
		return new ArrayList<>( STYLES.keySet() );
	}

	/** @return the styles, in the order they were registered */
	public static synchronized List<PromptStyle> all() {
		return new ArrayList<>( STYLES.values() );
	}
}
