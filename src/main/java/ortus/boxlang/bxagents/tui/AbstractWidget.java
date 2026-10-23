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

/**
 * What the widgets share: the name, the description and example, and the cut that keeps one widget from taking the
 * whole bar. A widget implements {@link #value} and returns the text it wants shown.
 */
public abstract class AbstractWidget implements Widget {

	/** the most cells a widget takes */
	protected static final int	MAX	= 28;

	private final String		name;
	private final String		description;
	private final String		example;

	protected AbstractWidget( String name, String description, String example ) {
		this.name			= name;
		this.description	= description;
		this.example		= example;
	}

	@Override
	public String name() {
		return name;
	}

	@Override
	public String description() {
		return description;
	}

	@Override
	public String example() {
		return example;
	}

	@Override
	public final String text( WidgetContext context ) {
		String v = value( context );
		if ( v == null ) {
			return "";
		}
		v = v.replace( '\n', ' ' ).strip();
		return v.length() <= MAX ? v : v.substring( 0, MAX - 1 ) + "…";
	}

	/**
	 * @param context what the screen knows
	 *
	 * @return the text to show, or null or empty for nothing
	 */
	protected abstract String value( WidgetContext context );

	/** @return a widget made from a name, a description, an example and the function that makes its text */
	public static Widget of( String name, String description, String example, java.util.function.Function<WidgetContext, String> value ) {
		return new AbstractWidget( name, description, example ) {

			@Override
			protected String value( WidgetContext context ) {
				return value.apply( context );
			}
		};
	}
}
