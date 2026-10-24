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

import java.nio.file.Path;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * The widgets that can be put in the prompt, by name. The built-in ones are here; {@link #register} adds another.
 */
public final class Widgets {

	private static final Map<String, Widget> WIDGETS = new LinkedHashMap<>();

	static {
		register( AbstractWidget.of( "agent", "the agent's name", "demo-assistant", c -> c.agent ) );
		register( AbstractWidget.of( "profile", "the profile or model in use", "fast-model", c -> c.profile ) );
		register( AbstractWidget.of( "folder", "the folder you are in", "~/work/demo", c -> folder( c.folder ) ) );
		register( AbstractWidget.of( "user", "who you are on this machine", "ada", c -> c.user ) );
		register( AbstractWidget.of( "clock", "the time, to the minute", "14:32", c -> c.clock.get().format( DateTimeFormatter.ofPattern( "HH:mm" ) ) ) );
		register( AbstractWidget.of( "machine", "the machine's name", "devbox", c -> c.host ) );
		register( AbstractWidget.of( "git", "the git branch, with * for changes", "main*", c -> c.git.apply( c.folder ) ) );
		register( AbstractWidget.of( "date", "today's date", "Fri 23 Oct",
		    c -> c.clock.get().format( DateTimeFormatter.ofPattern( "EEE d MMM", Locale.ENGLISH ) ) ) );
		register( AbstractWidget.of( "session", "the conversation's name", "billing questions", c -> c.session ) );
		register( AbstractWidget.of( "elapsed", "how long the last turn took", "last turn 4.2s",
		    c -> c.lastTurnMs < 0 ? "" : String.format( Locale.ROOT, "last turn %.1fs", c.lastTurnMs / 1000.0 ) ) );
		register( AbstractWidget.of( "ctx", "the size of the context", "ctx ~253", c -> c.ctx ) );
	}

	private Widgets() {
	}

	/** Makes a widget available by its name; a widget with the same name is replaced. */
	public static synchronized void register( Widget widget ) {
		WIDGETS.put( widget.name().toLowerCase( Locale.ROOT ), widget );
	}

	/** Takes a widget away by its name, such as one that was registered for a moment; nothing happens when there is none. */
	public static synchronized void unregister( String name ) {
		if ( name != null ) {
			WIDGETS.remove( name.trim().toLowerCase( Locale.ROOT ) );
		}
	}

	/**
	 * @param name a widget name, in any case
	 *
	 * @return the widget, or null when there is none of that name
	 */
	public static synchronized Widget get( String name ) {
		return name == null ? null : WIDGETS.get( name.trim().toLowerCase( Locale.ROOT ) );
	}

	/** @return the names, in the order they were registered */
	public static synchronized List<String> names() {
		return new ArrayList<>( WIDGETS.keySet() );
	}

	/** @return the widgets, in the order they were registered */
	public static synchronized List<Widget> all() {
		return new ArrayList<>( WIDGETS.values() );
	}

	/** the folder with the home folder written as ~, and the front cut off when it is long */
	private static String folder( Path folder ) {
		if ( folder == null ) {
			return "";
		}
		String	path	= folder.toAbsolutePath().normalize().toString();
		String	home	= System.getProperty( "user.home", "" );
		if ( !home.isEmpty() && ( path.equals( home ) || path.startsWith( home + java.io.File.separator ) ) ) {
			path = "~" + path.substring( home.length() );
		}
		return path.length() <= 28 ? path : "…" + path.substring( path.length() - 27 );
	}
}
