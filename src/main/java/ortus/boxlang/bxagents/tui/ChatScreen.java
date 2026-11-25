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

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;

import org.jline.terminal.Terminal;
import org.jline.terminal.TerminalBuilder;

import dev.tamboui.backend.jline3.JLineBackend;
import dev.tamboui.terminal.Frame;
import dev.tamboui.terminal.KeyboardProtocol;
import dev.tamboui.text.Line;
import dev.tamboui.text.Span;
import dev.tamboui.text.Text;
import dev.tamboui.tui.InlineTuiConfig;
import dev.tamboui.tui.InlineTuiRunner;
import dev.tamboui.tui.event.Event;
import dev.tamboui.tui.event.KeyCode;
import dev.tamboui.tui.event.KeyEvent;
import dev.tamboui.tui.event.PasteEvent;

/**
 * The chat screen, in the style of Pi: no alternate screen. Everything that is finished
 * (your messages, the agent's answer rendered as Markdown, each tool call) is printed into
 * the terminal's own scrollback, so it can be selected, searched and scrolled like any
 * other terminal output. Only a small live area at the bottom is redrawn: the answer as it
 * streams, running tools, the message box and a line of key hints.
 *
 * Two threads share it during a turn. The caller's thread runs the agent and feeds
 * {@link #push(Map)}; a thread of this class draws and reads keys. Esc sets a flag the
 * caller reads with {@link #cancelRequested()}; a message sent while the agent works is
 * queued for {@link #takeSteer()}. Between turns {@link #readInput()} does both jobs on
 * the caller's thread.
 *
 * Events pushed during a turn are maps with a "type":
 * <ul>
 * <li>delta: "text" is more of the answer</li>
 * <li>reasoning: "text" is more of the model's thinking (shown while it works, never kept)</li>
 * <li>tool: "id", "name", "summary", "status" (running, ok or error), "ms"</li>
 * <li>notice: "text" is a note for the user</li>
 * <li>error: "text" is what went wrong</li>
 * </ul>
 */
public final class ChatScreen implements AutoCloseable {

	/**
	 * The spinner frames used for indicating ongoing operations.
	 */
	static final String[]					SPINNER			= { "⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏" };

	/**
	 * The maximum number of tail lines to display in the chat screen.
	 */
	private static final int				MAX_TAIL		= 8;

	/**
	 * Minimum turn duration, in milliseconds, before the {@code notify} setting alerts the person that it finished.
	 */
	private static final long				NOTIFY_AFTER_MS	= 10_000;

	/**
	 * The maximum number of lines allowed in the composer input area.
	 */
	private static final int				MAX_COMPOSER	= 6;

	/**
	 * Maximum number of clipboard images that may be attached to one message.
	 */
	private static final int				MAX_IMAGES		= 4;

	/**
	 * Runner responsible for managing the inline TUI and drawing its live area.
	 */
	private final InlineTuiRunner			runner;

	/**
	 * Terminal used for low-level operations such as reading input, querying dimensions, and sending notifications.
	 */
	private final Terminal					terminal;

	/**
	 * Recording wrapper around the terminal, used to capture output and manage terminal recordings.
	 */
	private final RecordingTerminal			tap;

	/**
	 * The theme used for styling the chat screen.
	 */
	private Theme							theme;

	/**
	 * The previous class loader before initializing the chat screen.
	 */
	private final ClassLoader				previousLoader;

	/**
	 * The slash menu used for handling slash commands within the chat screen.
	 */
	private final SlashMenu					slash;

	/**
	 * What the chat runs with, decided from the layers, and where the files are that hold the person's own choices
	 */
	private TuiSettings.Resolved			settings		= TuiSettings.defaults();

	/**
	 * The file path to the agent configuration file.
	 */
	private String							agentFile		= "";
	/**
	 * The file path to the user's configuration file.
	 */
	private String							userFile		= "";
	/**
	 * The version of the chat screen or agent.
	 */
	private String							version			= "";
	/**
	 * The name of the agent.
	 */
	private String							agentName		= "";

	/**
	 * What the heading lists as loaded, a line for each label in the order the lines were set
	 */
	private final Map<String, Header.Group>	loaded			= new java.util.LinkedHashMap<>();
	/**
	 * Settings files approved for writing in this chat: {@code false} represents the agent file and {@code true} the global user file.
	 */
	private final java.util.Set<Boolean>	savedTo			= new java.util.HashSet<>();

	/**
	 * Whether this screen has set the terminal title and must restore it when closed.
	 */
	private boolean							titleSet;

	/**
	 * Message composer that holds the user's current draft and caret position.
	 */
	private final Composer					composer		= new Composer();

	/**
	 * Key bindings for built-in and extension actions.
	 */
	private KeyMap							keys			= KeyMap.defaults();

	/**
	 * Extension action id queued by {@link #readInput()}, returned by {@link #takeKey()}.
	 */
	private String							pendingKey;

	/**
	 * Sources offered by the {@code @} file-mention menu.
	 */
	private AtSources						sources			= new AtSources( List.of(), ( name, query ) -> List.of() );

	/**
	 * Agent events waiting to be applied to the live turn display.
	 */
	private final Queue<Map<?, ?>>			events			= new ConcurrentLinkedQueue<>();

	/**
	 * Messages submitted by the user to steer the active agent turn.
	 */
	private final Queue<String>				steer			= new ConcurrentLinkedQueue<>();

	/**
	 * Whether the user requested that the active turn stop.
	 */
	private volatile boolean				cancel;

	/**
	 * Short note at the front of the hint row, such as context size; empty when there is no status.
	 */
	private volatile String					status			= "";

	/**
	 * Whether the active turn's drawing loop should finish.
	 */
	private volatile boolean				turnOver;

	/**
	 * Style and widgets used to render the message box; changed by {@code /prompt} or the agent's {@code tui:} configuration.
	 */
	private volatile PromptLook				look			= PromptLook.defaults();

	/**
	 * Dynamic facts supplied to prompt widgets, such as agent, profile, and session.
	 */
	private final WidgetContext				facts			= new WidgetContext();

	/**
	 * Background thread that draws and reads input while an agent turn is active.
	 */
	private Thread							turnThread;

	/**
	 * Index of project files offered by the message box's {@code @} mention menu.
	 */
	private final FileIndex					fileIndex		= new FileIndex( Path.of( System.getProperty( "user.dir" ) ) );

	/**
	 * Clipboard reader used when the user pastes an image.
	 */
	private final ClipboardImage			clipboard		= ClipboardImage.ofThisMachine();

	/**
	 * Paths of clipboard images attached to the next message.
	 */
	private final List<String>				images			= new ArrayList<>();

	/**
	 * Temporary directory holding image files copied from the clipboard.
	 */
	private Path							pasteFolder;

	/**
	 * Whether the current model supports image attachments.
	 */
	private boolean							imagesAllowed	= true;

	/**
	 * Explanation shown when image attachments are unavailable.
	 */
	private String							imagesRefusal	= "";

	/**
	 * Selected index in the current file-mention menu.
	 */
	private int								atPick;

	/**
	 * Whether the file index has been refreshed for the current mention query.
	 */
	private boolean							indexed;

	/**
	 * Buffered answer text not yet committed to terminal scrollback.
	 */
	private final StringBuilder				segment			= new StringBuilder();

	/**
	 * Buffered model reasoning shown only when the thinking setting is enabled.
	 */
	private final StringBuilder				reasoning		= new StringBuilder();

	/**
	 * Whether a tool completed since the answer segment was last printed.
	 */
	private boolean							toolJustCompleted;

	/**
	 * Tool events currently shown as running, keyed by their event id.
	 */
	private final Map<String, Map<?, ?>>	running			= new LinkedHashMap<>();

	/**
	 * Start time of the active turn, used for elapsed-time labels and notifications.
	 */
	private long							turnStarted;

	/**
	 * Current animation frame for the live spinner.
	 */
	private int								frame;

	/**
	 * Height of the live area on the previous draw, used to clear rows when it shrinks.
	 */
	private int								drawnHeight;

	/**
	 * Creates a chat screen around an initialized TUI runner and terminal.
	 *
	 * @param runner         inline TUI runner used to draw and poll input
	 * @param terminal       terminal used for low-level operations
	 * @param tap            recording wrapper around the terminal
	 * @param theme          active terminal theme
	 * @param previousLoader thread context class loader to restore when the screen closes
	 * @param commands       slash commands offered by the screen
	 */
	private ChatScreen( InlineTuiRunner runner, Terminal terminal, RecordingTerminal tap, Theme theme, ClassLoader previousLoader,
	    List<Map<?, ?>> commands ) {
		this.runner			= runner;
		this.terminal		= terminal;
		this.tap			= tap;
		this.theme			= theme;
		this.previousLoader	= previousLoader;
		this.slash			= new SlashMenu( commands );
	}

	/**
	 * Opens the chat area at the bottom of the terminal.
	 *
	 * @param slashCommands maps with "name" (such as /new) and "hint", offered when the message starts with /
	 *
	 * @return the open screen
	 *
	 * @throws Exception when the terminal cannot be put in raw mode
	 */
	public static ChatScreen open( List<?> slashCommands ) throws Exception {
		return open( slashCommands, false );
	}

	/**
	 * Opens the chat area at the bottom of the terminal, after clearing the screen when asked to, so the header can be drawn at the top
	 *
	 * @param slashCommands maps with "name" (such as /new) and "hint", offered when the message starts with /
	 * @param clear         true to clear the visible screen first (the terminal's scrollback is kept)
	 *
	 * @return the screen
	 *
	 * @throws Exception when the terminal cannot be opened
	 */
	public static ChatScreen open( List<?> slashCommands, boolean clear ) throws Exception {
		// see TuiScreen.open(): JLine finds its terminal providers through this loader
		ClassLoader	own		= ChatScreen.class.getClassLoader();
		ClassLoader	before	= Thread.currentThread().getContextClassLoader();
		Thread.currentThread().setContextClassLoader( own );
		try {
			List<Map<?, ?>> cmds = new ArrayList<>();
			for ( Object o : slashCommands ) {
				if ( o instanceof Map<?, ?> m ) {
					cmds.add( m );
				}
			}
			InlineTuiConfig		cfg			= InlineTuiConfig.builder( 3 ).clearOnClose( true ).bracketedPaste( true )
			    .keyboardProtocol( KeyboardProtocol.AUTO ).build();
			// the terminal is made here, the way the backend would make it, so a recording can be started on it
			Terminal			terminal	= TerminalBuilder.builder().system( true ).jansi( true ).build();
			RecordingTerminal	tap			= RecordingTerminal.wrap( terminal );
			if ( clear ) {
				terminal.writer().print( "\u001b[2J\u001b[H" );
				terminal.writer().flush();
			}
			try {
				return new ChatScreen( InlineTuiRunner.create( new JLineBackend( tap.terminal() ), cfg ), terminal, tap, Theme.detect(), before, cmds );
			} catch ( Exception | Error e ) {
				terminal.close();
				throw e;
			}
		} catch ( Exception | Error e ) {
			Thread.currentThread().setContextClassLoader( before );
			throw e;
		}
	}

	/**
	 * Replaces the keys the screen answers to, once, before the first message is read.
	 *
	 * @param overrides action id to the keys, such as {@code newline -> [ "ctrl+j" ]}, from the person's own file
	 *
	 * @return what was wrong with the overrides, as sentences; they were left out and the defaults kept
	 */
	public List<String> bindKeys( Map<?, ?> overrides ) {
		return bindKeys( overrides, List.of() );
	}

	/**
	 * Like {@link #bindKeys(Map)}, and adds the actions extensions bring.
	 *
	 * @param extras each a map with {@code id}, {@code does} and {@code keys} (a list of keys, such as {@code ctrl+g}). Pressing one of
	 *               its keys in the message box makes {@link #readInput()} return an empty message and {@link #takeKey()} return its id.
	 *
	 * @return problems found in the overrides or extension actions
	 */
	public List<String> bindKeys( Map<?, ?> overrides, List<? extends Map<?, ?>> extras ) {
		List<KeyMap.Extra> actions = new java.util.ArrayList<>();
		for ( Map<?, ?> x : extras ) {
			List<String>	defaults	= new java.util.ArrayList<>();
			Object			given		= x.get( "keys" );
			if ( given instanceof List<?> l ) {
				for ( Object o : l ) {
					defaults.add( String.valueOf( o ) );
				}
			} else if ( given != null ) {
				defaults.add( String.valueOf( given ) );
			}
			actions.add( new KeyMap.Extra( String.valueOf( x.get( "id" ) ), String.valueOf( x.get( "does" ) ), defaults ) );
		}
		keys = KeyMap.of( overrides, actions );
		composer.keys( keys );
		return keys.problems();
	}

	/**
	 * Lets the {@code @} menu offer extension sources: their names while one is being typed, and their own suggestions
	 * after the colon.
	 *
	 * @param names     the source names in use
	 * @param suggester asked for ( name, what follows the colon ) and returns the values to offer
	 */
	public void bindSources( List<String> names, java.util.function.BiFunction<String, String, List<String>> suggester ) {
		sources = new AtSources( names, suggester );
	}

	/** @return the id of the extension action whose key was pressed since the last call, or null */
	public String takeKey() {
		String taken = pendingKey;
		pendingKey = null;
		return taken;
	}

	/** @return a row per key action: id, keys, does, place (box or run), for the /keys help */
	public List<Map<String, String>> keyTable() {
		return keys.table();
	}

	/**
	 * Normalizes a label for case-insensitive comparisons.
	 *
	 * @param label label to convert
	 *
	 * @return the label in lowercase using a locale-independent mapping
	 */
	private static String lower( String label ) {
		return label.toLowerCase( java.util.Locale.ROOT );
	}

	/** @return the palette, so BoxLang can paint its own output to match */
	public Theme theme() {
		return theme;
	}

	// ----------------------------------------------------------------------------------
	// Printing into the scrollback
	// ----------------------------------------------------------------------------------

	/**
	 * Sets the version the header shows beside the name; without one the header shows none
	 *
	 * @param version the version of the module, such as {@code 1.2.0}
	 */
	public void setVersion( String version ) {
		this.version = version == null ? "" : version;
	}

	/**
	 * Sets one line of what the heading lists as loaded. Call it once for each line before {@link #banner}, in the order the lines are to
	 * be shown; without any call the heading lists nothing. A line with nothing in it is left out.
	 *
	 * @param label The word the line starts with: {@code skills}, {@code extensions}, {@code connectors}, {@code gateways} or {@code mcp}
	 * @param names What is there
	 * @param bad   What is there but is not working, shown last in the warning colour
	 */
	public void setLoaded( String label, List<String> names, List<String> bad ) {
		loaded.put( label, new Header.Group( label, names == null ? List.of() : List.copyOf( names ), bad == null ? List.of() : List.copyOf( bad ) ) );
	}

	/**
	 * Prints the heading, as the {@code header} setting says: the mark with the name and the agent, the version, the model, the skills and extensions
	 * loaded, and the keys; or one line;
	 * or nothing. With {@code fullscreen} on, the lines that follow push the message box down to the bottom of the screen, so the box does
	 * not sit right under the header. Also puts the agent's name in the terminal's title when {@code terminalTitle} is on.
	 *
	 * @param agent the agent's name
	 * @param model the model in use
	 * @param mode  how the chat reaches the agent
	 */
	public void banner( String agent, String model, String mode ) {
		this.agentName = agent;
		String		how		= settings.get( "header" );
		List<Line>	lines	= new ArrayList<>();
		String		hints	= lower( keys.first( KeyMap.Action.SUBMIT ) ) + " send · " + lower( keys.first( KeyMap.Action.NEWLINE ) )
		    + " new line · / commands · ? keys";
		String		more	= lower( keys.first( KeyMap.Action.STOP ) ) + " stops · " + lower( keys.first( KeyMap.Action.CLEAR ) )
		    + " clears the box · "
		    + lower( keys.first( KeyMap.Action.CLEAR_SCREEN ) ) + " clears the screen";
		String		name	= " bxAgents";
		int			cols	= runner.width();
		int			tall	= terminal.getSize().getRows() > 0 ? terminal.getSize().getRows() : 24;
		// the mark with the text beside it needs the room; a small terminal gets the one line instead
		if ( "full".equals( how ) && !Header.fits( cols, tall ) ) {
			how = "compact";
		}
		if ( "full".equals( how ) ) {
			Header.Facts facts = new Header.Facts( agent, version, model, mode, List.of( hints, more ),
			    List.copyOf( loaded.values() ) );
			for ( Row row : Header.rows( theme, facts, cols ) ) {
				lines.add( row.toLine() );
			}
		} else if ( "compact".equals( how ) ) {
			lines.add( Row.of().add( name, theme.accentBold ).add( version.isEmpty() ? "" : " v" + version, theme.muted ).add( "   " + agent, theme.bold )
			    .add( " · " + model + " · " + mode, theme.muted ).toLine() );
			lines.add( Row.of( " " + hints + " · " + more, theme.muted ).toLine() );
			lines.add( Line.from( Span.raw( "" ) ) );
		}
		for ( Line l : lines ) {
			out( l );
		}
		if ( settings.bool( "fullscreen" ) ) {
			// the box is drawn right under the header; empty lines push it down to the bottom of the screen
			int	rows	= terminal.getSize().getRows() > 0 ? terminal.getSize().getRows() : 24;
			int	fill	= rows - lines.size() - 5;
			for ( int i = 0; i < fill; i++ ) {
				out( Text.from( "" ) );
			}
		}
		if ( settings.bool( "terminalTitle" ) ) {
			// save the title the terminal had, to put it back when the chat closes, and name the agent
			terminal.writer().print( "\u001b[22;0t\u001b]2;bxAgents · " + agent + "\u0007" );
			terminal.writer().flush();
			titleSet = true;
		}
	}

	/**
	 * Prints a blank line between turns unless the spacing setting is {@code compact}.
	 */
	private void gap() {
		if ( !"compact".equals( settings.get( "spacing" ) ) ) {
			out( Text.from( "" ) );
		}
	}

	/**
	 * @return How many commands or files the menus show at once: the {@code menuRows} setting
	 */
	private int menuRows() {
		return settings.integer( "menuRows" );
	}

	/**
	 * @return The marker of work in progress: the frame of the spinner now, or a still dot when the {@code animations} setting is off
	 */
	private String spinner() {
		return settings.bool( "animations" ) ? SPINNER[ frame % SPINNER.length ] : "●";
	}

	/**
	 * Writes a styled line into the TUI's scrollback.
	 *
	 * @param line line to print
	 */
	private void out( Line line ) {
		runner.println( Text.from( line ) );
	}

	/**
	 * Writes text into the TUI's scrollback.
	 *
	 * @param text text to print
	 */
	private void out( Text text ) {
		runner.println( text );
	}

	/**
	 * Sets the status segment of the hint row under the message box, for example {@code ctx ~12.4k / 128k 9%}.
	 * It shows from the next time the box is drawn; an empty text removes it.
	 *
	 * @param text status to display, or empty to clear it
	 */
	public void setStatus( String text ) {
		this.status	= text == null ? "" : text;
		facts.ctx	= status;
	}

	// ----------------------------------------------------------------------------------
	// The look of the message box
	// ----------------------------------------------------------------------------------

	/**
	 * Sets the settings the chat runs with and where the files that can change them are
	 *
	 * @param resolved  What {@link TuiSettings#resolve} decided: the value of every setting and the layer it came from
	 * @param agentFile The agent's own settings file in its data home, empty when there is none
	 * @param userFile  The person's file for every agent
	 */
	public void useSettings( TuiSettings.Resolved resolved, String agentFile, String userFile ) {
		this.settings	= resolved;
		this.agentFile	= agentFile == null ? "" : agentFile;
		this.userFile	= userFile == null ? "" : userFile;
		this.theme		= Theme.detect( resolved.get( "theme" ) );
		this.slash.setWindow( resolved.integer( "menuRows" ) );
	}

	/**
	 * @return The settings the chat runs with
	 */
	public TuiSettings.Resolved settings() {
		return settings;
	}

	/**
	 * Sets the look from the {@code tui:} block, as the layers of Agent.yml and the settings files decided: a map with {@code prompt} and
	 * {@code widgets}
	 * ({@code top} and {@code bottom} lists). What is missing keeps its default; a name that is not known is left out.
	 *
	 * @param tui resolved TUI look configuration
	 */
	public void useLook( Map<?, ?> tui ) {
		look = PromptLook.of( tui );
	}

	/**
	 * @return the look now in use and what can be chosen: {@code prompt}, {@code top}, {@code bottom}, {@code styles}
	 *         (maps with name and description) and {@code widgets} (name, description and example)
	 */
	public Map<String, Object> promptLook() {
		Map<String, Object>	m	= new LinkedHashMap<>();
		PromptLook			now	= look;
		m.put( "prompt", now.style() );
		m.put( "top", now.top() );
		m.put( "bottom", now.bottom() );
		List<Map<String, String>> styles = new ArrayList<>();
		for ( PromptStyle st : PromptStyles.all() ) {
			styles.add( Map.of( "name", st.name(), "description", st.description() ) );
		}
		m.put( "styles", styles );
		List<Map<String, String>> widgets = new ArrayList<>();
		for ( Widget w : Widgets.all() ) {
			widgets.add( Map.of( "name", w.name(), "description", w.description(), "example", w.example() ) );
		}
		m.put( "widgets", widgets );
		return m;
	}

	/**
	 * Switches the style, for this chat.
	 *
	 * @param name prompt style name
	 *
	 * @return an empty string, or what was wrong with the name
	 */
	public String setPromptStyle( String name ) {
		if ( PromptStyles.get( name ) == null ) {
			return "There is no prompt style '" + name + "'. The styles are " + String.join( ", ", PromptStyles.names() ) + ".";
		}
		look = look.withStyle( PromptStyles.get( name ).name() );
		return "";
	}

	/**
	 * Sets the widgets of one place, for this chat.
	 *
	 * @param place top or bottom
	 * @param names widget names, in the order to show them
	 *
	 * @return an empty string, or what was wrong
	 */
	public String setWidgets( String place, List<?> names ) {
		List<String> list = new ArrayList<>();
		for ( Object n : names ) {
			String name = String.valueOf( n ).trim().toLowerCase( java.util.Locale.ROOT );
			if ( Widgets.get( name ) == null ) {
				return "There is no widget '" + name + "'. The widgets are " + String.join( ", ", Widgets.names() ) + ".";
			}
			if ( !list.contains( name ) ) {
				list.add( name );
			}
		}
		if ( place.equals( "top" ) ) {
			look = look.withTop( list );
		} else if ( place.equals( "bottom" ) ) {
			look = look.withBottom( list );
		} else {
			return "The places are top and bottom.";
		}
		return "";
	}

	/**
	 * Tells the widgets what the chat knows: {@code agent}, {@code profile} and {@code session}. A missing entry is left as it was.
	 *
	 * @param values fact names and values to update
	 */
	public void setFacts( Map<?, ?> values ) {
		Object v = values.get( "agent" );
		if ( v != null ) {
			facts.agent = String.valueOf( v );
		}
		v = values.get( "profile" );
		if ( v != null ) {
			facts.profile = String.valueOf( v );
		}
		v = values.get( "session" );
		if ( v != null ) {
			facts.session = String.valueOf( v );
		}
	}

	/**
	 * Sets whether a picture may be pasted, with the reason to show when the model cannot see images.
	 *
	 * @param allowed whether image attachments are supported
	 * @param reason  explanation shown when attachments are not allowed
	 */
	public void setImagesAllowed( boolean allowed, String reason ) {
		this.imagesAllowed	= allowed;
		this.imagesRefusal	= reason == null ? "" : reason;
	}

	/**
	 * Hands over the pictures pasted since the last message, as file paths, and forgets them.
	 *
	 * @return paths to the images attached to the next message
	 */
	public List<String> takeImages() {
		List<String> taken = new ArrayList<>( images );
		images.clear();
		return taken;
	}

	/**
	 * Prints what the user sent, wrapped to fit the terminal.
	 *
	 * @param text user's message
	 */
	public void printUser( String text ) {
		List<String> lines = Wrap.wrap( text, Math.max( 20, runner.width() - 8 ) );
		for ( int i = 0; i < lines.size(); i++ ) {
			Row r = Row.of();
			r.add( i == 0 ? " you  " : "      ", theme.accentBold );
			r.add( lines.get( i ), theme.plain );
			out( r.toLine() );
		}
		gap();
	}

	/**
	 * Prints a note.
	 *
	 * @param style accent, ok, muted, warn or error
	 * @param text  the note
	 */
	public void print( String style, String text ) {
		String			marker	= style.equals( "error" ) ? " ✖ " : style.equals( "ok" ) ? " ✔ " : style.equals( "warn" ) ? " ! " : " · ";
		Row				r		= Row.of().add( marker, styleOf( style ) );
		List<String>	lines	= Wrap.wrap( text, Math.max( 20, runner.width() - 6 ) );
		for ( int i = 0; i < lines.size(); i++ ) {
			out( ( i == 0 ? r : Row.of().add( "   ", theme.plain ) ).add( lines.get( i ), styleOf( style ) ).toLine() );
			r = Row.of().add( "   ", theme.plain );
		}
	}

	public void blankLine() {
		out( Text.from( "" ) );
	}

	/**
	 * Prints Markdown as the agent's answer, using the configured source or rendered style.
	 *
	 * @param markdown answer text to print
	 */
	public void printMarkdown( String markdown ) {
		if ( markdown == null || markdown.isBlank() ) {
			return;
		}
		if ( "source".equals( settings.get( "markdown" ) ) ) {
			// the text as the model wrote it, wrapped to the screen
			for ( String l : Wrap.wrap( markdown.strip(), Math.max( 20, runner.width() - 4 ) ) ) {
				out( Row.of( "  " + l, theme.plain ).toLine() );
			}
		} else {
			for ( Line l : MarkdownLines.render( markdown.strip(), runner.width() - 3, theme ) ) {
				out( Line.from( Span.raw( "  " ) ).append( l ) );
			}
		}
		gap();
	}

	/**
	 * Resolves a named style to the corresponding theme style.
	 *
	 * @param name style name such as {@code accent}, {@code ok}, {@code warn}, or {@code error}
	 *
	 * @return matching theme style, or the muted style for an unknown name
	 */
	private dev.tamboui.style.Style styleOf( String name ) {
		switch ( name ) {
			case "accent" :
				return theme.accent;
			case "ok" :
				return theme.ok;
			case "warn" :
				return theme.warn;
			case "error" :
				return theme.error;
			default :
				return theme.muted;
		}
	}

	/**
	 * Puts text on the clipboard with the OSC 52 escape, which most terminals honor, including
	 * over SSH. A terminal that ignores it simply does nothing.
	 *
	 * @param text text to copy
	 */
	public void copy( String text ) {
		String encoded = java.util.Base64.getEncoder().encodeToString( text.getBytes( java.nio.charset.StandardCharsets.UTF_8 ) );
		System.out.print( "\u001b]52;c;" + encoded + "\u0007" );
		System.out.flush();
	}

	// ----------------------------------------------------------------------------------
	// Reading a message
	// ----------------------------------------------------------------------------------

	/**
	 * Waits for the user to send a message.
	 *
	 * @return the submitted message, an empty string when an extension action was triggered, or {@code null} when the user exits
	 */
	public String readInput() {
		while ( true ) {
			draw( idleRows() );
			Event ev = runner.pollEvent( Duration.ofMillis( 150 ) );
			if ( ev instanceof PasteEvent p ) {
				composer.paste( p.text() );
			} else if ( ev instanceof KeyEvent k ) {
				// the shortcuts panel: F1 or Ctrl+/ at any time, or ? on an empty box. What is typed stays in the box.
				if ( k.isKey( KeyCode.F1 ) || k.hasCtrl() && ( k.isChar( '/' ) || k.isChar( '_' ) )
				    || composer.text().isEmpty() && k.isKey( KeyCode.CHAR ) && k.isChar( '?' ) && !k.hasCtrl() ) {
					showKeys();
					continue;
				}
				slash.sync( composer.text(), composer.rowCount() );
				if ( slash.isOpen() ) {
					if ( k.isKey( KeyCode.UP ) || k.isKey( KeyCode.DOWN ) ) {
						slash.move( k.isKey( KeyCode.DOWN ) ? 1 : -1 );
						continue;
					}
					if ( k.isKey( KeyCode.ESCAPE ) ) {
						slash.dismiss();
						continue;
					}
					if ( keys.is( KeyMap.Action.COMPLETE, k ) ) {
						composer.setText( slash.picked().name() + " " );
						continue;
					}
					if ( keys.is( KeyMap.Action.SUBMIT, k ) ) {
						SlashMenu.Item picked = slash.picked();
						// what was typed in full is sent as it is; otherwise Enter takes the pick: a command that needs nothing runs, one
						// that takes something is filled in so the rest can be typed
						if ( !composer.text().equals( picked.name() ) ) {
							composer.setText( picked.fill() );
							if ( !picked.runsAtOnce() ) {
								continue;
							}
						}
					}
				}
				List<String> files = atMatches();
				if ( !files.isEmpty() ) {
					if ( k.isKey( KeyCode.UP ) || k.isKey( KeyCode.DOWN ) ) {
						atPick = Math.floorMod( atPick + ( k.isKey( KeyCode.DOWN ) ? 1 : -1 ), Math.min( menuRows(), files.size() ) );
						continue;
					}
					if ( keys.is( KeyMap.Action.COMPLETE, k ) ) {
						composer.replaceAtMention( files.get( Math.min( atPick, files.size() - 1 ) ) );
						atPick = 0;
						continue;
					}
				}
				if ( keys.is( KeyMap.Action.PASTE_IMAGE, k ) ) {
					pasteImage();
					continue;
				}
				if ( keys.is( KeyMap.Action.CLEAR_SCREEN, k ) ) {
					clearScreen();
					continue;
				}
				String action = keys.extension( k );
				if ( action != null ) {
					// what is typed stays in the box; the caller runs the action and reads again
					pendingKey = action;
					return "";
				}
				Composer.Outcome outcome = composer.key( k );
				if ( outcome == Composer.Outcome.EXIT ) {
					return null;
				}
				if ( outcome == Composer.Outcome.SUBMIT ) {
					String text = composer.text().strip();
					composer.sent();
					return text;
				}
			}
		}
	}

	/**
	 * The files the {@code @} mention under the caret could mean: those whose path contains what was typed after it.
	 * The folder is looked at once each time the box is read, when the first at sign is typed.
	 *
	 * @return matching project files and any matching extension-provided sources
	 */
	private List<String> atMatches() {
		String query = composer.atQuery();
		if ( query == null ) {
			indexed = false;
			return List.of();
		}
		if ( !indexed ) {
			fileIndex.refresh();
			indexed = true;
		}
		List<String> files = fileIndex.match( query, menuRows() );
		return sources.isEmpty() ? files : sources.matches( query, files, menuRows() );
	}

	/** Ctrl+V: adds the picture on the clipboard to the next message, or says why it cannot. */
	private void pasteImage() {
		if ( !imagesAllowed ) {
			print( "warn", imagesRefusal.isEmpty() ? "The model in use cannot see images." : imagesRefusal );
			return;
		}
		if ( images.size() >= MAX_IMAGES ) {
			print( "warn", "At most " + MAX_IMAGES + " pictures go with one message." );
			return;
		}
		try {
			if ( pasteFolder == null ) {
				pasteFolder = Files.createTempDirectory( "bxagents-paste-" );
			}
		} catch ( IOException e ) {
			print( "warn", "Could not keep the picture: " + e.getMessage() );
			return;
		}
		Optional<Path> saved = clipboard.save( pasteFolder );
		if ( saved.isEmpty() ) {
			print( "warn",
			    "There is no picture on the clipboard, or no tool to read it (wl-paste or xclip on Linux, pngpaste on macOS). Text is pasted with your terminal's own paste." );
			return;
		}
		images.add( saved.get().toString() );
		print( "ok", "Added the picture from the clipboard (" + images.size() + " to send)." );
	}

	// ----------------------------------------------------------------------------------
	// A choice, for approvals
	// ----------------------------------------------------------------------------------

	/**
	 * Asks the user to pick one of a few options in the live area.
	 *
	 * @param title   the question
	 * @param lines   context shown above the options
	 * @param choices strings or maps with value, label and hint
	 *
	 * @return the value picked, or null for Esc
	 */
	public String choose( String title, List<?> lines, List<?> choices ) {
		List<String> preface = new ArrayList<>();
		for ( Object l : lines ) {
			preface.add( String.valueOf( l ) );
		}
		SelectPrompt prompt = new SelectPrompt( theme, title, "", Choice.listFrom( choices ), null, preface );
		try {
			while ( !prompt.isDone() ) {
				List<Row> rows = new ArrayList<>( prompt.render( runner.width() - 2, 14 ) );
				rows.add( Row.of( " " + prompt.footer(), theme.muted ) );
				draw( rows );
				Event ev = runner.pollEvent( Duration.ofMillis( 150 ) );
				if ( ev instanceof KeyEvent k ) {
					prompt.key( k );
				}
			}
			return ( String ) prompt.result();
		} catch ( PromptAbort a ) {
			return null;
		}
	}

	/**
	 * A list to pick from where some letters act on the row under the cursor.
	 *
	 * @param title   the heading
	 * @param lines   context shown above the options
	 * @param choices strings or maps with value, label and hint
	 * @param keys    the letters that act, for example "aedst"; Tab also acts
	 * @param footer  the hint line
	 *
	 * @return the value picked on Enter, "letter:value" (or "tab:value") for a letter, null for Esc
	 */
	public String chooseKeys( String title, List<?> lines, List<?> choices, String keys, String footer ) {
		List<String> preface = new ArrayList<>();
		for ( Object l : lines ) {
			preface.add( String.valueOf( l ) );
		}
		SelectPrompt prompt = new SelectPrompt( theme, title, "", Choice.listFrom( choices ), null, preface ).withHotkeys( keys, footer );
		try {
			while ( !prompt.isDone() ) {
				List<Row> rows = new ArrayList<>( prompt.render( runner.width() - 2, 16 ) );
				rows.add( Row.of( " " + prompt.footer(), theme.muted ) );
				draw( rows );
				Event ev = runner.pollEvent( Duration.ofMillis( 150 ) );
				if ( ev instanceof KeyEvent k ) {
					prompt.key( k );
				}
			}
			return ( String ) prompt.result();
		} catch ( PromptAbort a ) {
			return null;
		}
	}

	/**
	 * Asks for one line of text in the live area.
	 *
	 * @param title   the question
	 * @param help    a line of help, or empty
	 * @param initial text to start with, for editing
	 *
	 * @return the text, or null for Esc
	 */
	public String ask( String title, String help, String initial ) {
		return ask( title, help, initial, false );
	}

	/**
	 * Asks for a secret in a box that shows bullets, never the text. For a vault value: it is not drawn, kept in
	 * a history or echoed anywhere.
	 *
	 * @param title the question
	 * @param help  a line of help, or blank
	 *
	 * @return the text, or null for Esc
	 */
	public String askSecret( String title, String help ) {
		return ask( title, help, "", true );
	}

	/**
	 * Displays a text prompt and returns its result.
	 *
	 * @param title   prompt title
	 * @param help    help text displayed below the title
	 * @param initial initial value for a non-secret prompt
	 * @param secret  whether the prompt should mask entered text
	 *
	 * @return entered text, or {@code null} when the user cancels
	 */
	private String ask( String title, String help, String initial, boolean secret ) {
		TextPrompt prompt = new TextPrompt( theme, title, help, "", secret, secret ? "A secret needs a value, or press esc." : "Type something, or press esc.",
		    initial );
		try {
			while ( !prompt.isDone() ) {
				List<Row> rows = new ArrayList<>( prompt.render( runner.width() - 2, 6 ) );
				rows.add( Row.of( " " + prompt.footer(), theme.muted ) );
				draw( rows );
				Event ev = runner.pollEvent( Duration.ofMillis( 150 ) );
				if ( ev instanceof KeyEvent k ) {
					prompt.key( k );
				} else if ( ev instanceof PasteEvent p ) {
					prompt.paste( p.text() );
				}
			}
			return ( String ) prompt.result();
		} catch ( PromptAbort a ) {
			return null;
		}
	}

	// ----------------------------------------------------------------------------------
	// A turn
	// ----------------------------------------------------------------------------------

	/**
	 * Starts drawing the agent's work. Call {@link #push(Map)} from the thread that runs it,
	 * then {@link #endTurn()}.
	 */
	public void beginTurn() {
		cancel		= false;
		turnOver	= false;
		events.clear();
		segment.setLength( 0 );
		reasoning.setLength( 0 );
		running.clear();
		toolJustCompleted	= false;
		turnStarted			= System.currentTimeMillis();
		turnThread			= new Thread( this::turnLoop, "bxagents-chat-ui" );
		turnThread.setDaemon( true );
		turnThread.start();
	}

	/**
	 * Queues an agent event for the live turn display. Safe to call from any thread.
	 *
	 * @param event event map; its {@code type} selects how the event is rendered
	 */
	public void push( Map<?, ?> event ) {
		events.add( event );
	}

	/** @return true once the user pressed Esc (or Ctrl+C) during the turn */
	public boolean cancelRequested() {
		return cancel;
	}

	/** @return a message the user sent while the agent was working, or null */
	public String takeSteer() {
		return steer.poll();
	}

	/** Stops drawing, prints whatever the agent said that is still on screen, and returns the area to the message box. */
	public void endTurn() {
		turnOver			= true;
		facts.lastTurnMs	= System.currentTimeMillis() - turnStarted;
		try {
			if ( turnThread != null ) {
				turnThread.join( 3000 );
			}
		} catch ( InterruptedException e ) {
			Thread.currentThread().interrupt();
		}
		drain();
		flushSegment();
		running.clear();
		notifyDone( facts.lastTurnMs );
	}

	/**
	 * Tells the person a long turn is over, as the {@code notify} setting says: the terminal bell, or a desktop notification through the
	 * escape that iTerm2, Kitty, WezTerm and Windows Terminal take. A turn shorter than {@value #NOTIFY_AFTER_MS} milliseconds is not worth it.
	 *
	 * @param turnMs How long the turn took
	 */
	private void notifyDone( long turnMs ) {
		String how = settings.get( "notify" );
		if ( "off".equals( how ) || turnMs < NOTIFY_AFTER_MS ) {
			return;
		}
		terminal.writer().print( "system".equals( how ) ? "\u001b]9;bxAgents: the answer is ready\u0007" : "\u0007" );
		terminal.writer().flush();
	}

	/**
	 * Draws the active turn and handles stop, steering, and pasted-input events until the turn ends.
	 */
	private void turnLoop() {
		while ( !turnOver ) {
			drain();
			draw( turnRows() );
			Event ev = runner.pollEvent( Duration.ofMillis( 80 ) );
			frame++;
			if ( ev instanceof PasteEvent p ) {
				composer.paste( p.text() );
			} else if ( ev instanceof KeyEvent k ) {
				if ( keys.is( KeyMap.Action.STOP, k ) ) {
					if ( !cancel ) {
						cancel = true;
						print( "warn", "Stopping after the current step." );
					}
					continue;
				}
				if ( composer.key( k ) == Composer.Outcome.SUBMIT ) {
					String text = composer.text().strip();
					composer.sent();
					steer.add( text );
					printUser( text );
				}
			}
		}
	}

	/**
	 * Applies queued agent events to the buffered answer, reasoning, tool, notice, and error state.
	 */
	private void drain() {
		Map<?, ?> e;
		while ( ( e = events.poll() ) != null ) {
			String type = String.valueOf( get( e, "type" ) );
			switch ( type ) {
				case "delta" :
					segment.append( get( e, "text" ) );
					break;
				case "reasoning" :
					reasoning.append( get( e, "text" ) );
					break;
				case "tool" :
					tool( e );
					break;
				case "notice" :
					flushSegment();
					print( "muted", String.valueOf( get( e, "text" ) ) );
					break;
				case "error" :
					flushSegment();
					print( "error", String.valueOf( get( e, "text" ) ) );
					break;
				default :
					break;
			}
		}
	}

	/**
	 * Adds, updates, or removes a tool from the visible running-tool list and prints its completion.
	 *
	 * @param e tool event map containing its id, status, name, summary, and optional duration
	 */
	private void tool( Map<?, ?> e ) {
		String	id		= String.valueOf( get( e, "id" ) );
		String	status	= String.valueOf( get( e, "status" ) );
		boolean	hidden	= "hidden".equals( settings.get( "tools" ) );
		if ( status.equals( "running" ) ) {
			flushSegment();
			if ( !hidden ) {
				running.put( id, e );
			}
			return;
		}
		running.remove( id );
		if ( hidden ) {
			return;
		}
		toolJustCompleted = true;
		boolean	ok		= status.equals( "ok" );
		Object	ms		= get( e, "ms" );
		String	took	= ms == null ? "" : String.format( "  %.1fs", Double.parseDouble( String.valueOf( ms ) ) / 1000.0 );
		Row		r		= Row.of().add( " ⚙ ", theme.muted ).add( String.valueOf( get( e, "name" ) ), theme.accentBold );
		String	summary	= String.valueOf( get( e, "summary" ) );
		if ( !summary.isEmpty() && !summary.equals( "null" ) && "detail".equals( settings.get( "tools" ) ) ) {
			r.add( "  " + clip( summary, Math.max( 10, runner.width() - 30 ) ), theme.muted );
		}
		r.add( ok ? "  ✔" : "  ✖", ok ? theme.ok : theme.error ).add( took, theme.muted );
		out( r.toLine() );
	}

	/**
	 * Prints buffered answer text to scrollback and clears the answer and reasoning buffers.
	 */
	private void flushSegment() {
		if ( segment.length() > 0 ) {
			if ( toolJustCompleted ) {
				out( Text.from( "" ) );
				toolJustCompleted = false;
			}
			printMarkdown( segment.toString() );
			segment.setLength( 0 );
		}
		reasoning.setLength( 0 );
	}

	// ----------------------------------------------------------------------------------
	// The live area
	// ----------------------------------------------------------------------------------

	/**
	 * Builds the live-area rows shown while waiting for the user to type or choose a command.
	 *
	 * @return rows for slash suggestions, file mentions, and the message composer
	 */
	private List<Row> idleRows() {
		List<Row> rows = new ArrayList<>();
		slash.sync( composer.text(), composer.rowCount() );
		rows.addAll( slashRows() );
		List<String> files = atMatches();
		for ( int i = 0; i < files.size(); i++ ) {
			rows.add( Row.of().add( "   @" + files.get( i ), i == Math.min( atPick, files.size() - 1 ) ? theme.selected : theme.plain ) );
		}
		String picture = images.isEmpty() ? "" : images.size() + ( images.size() == 1 ? " picture" : " pictures" ) + " attached · ";
		rows.addAll( promptRows( false, "you", picture + lower( keys.first( KeyMap.Action.SUBMIT ) ) + " send · " + lower( keys.first( KeyMap.Action.NEWLINE ) )
		    + " new line · ? keys" + ( slash.isOpen() || !files.isEmpty() ? " · tab completes" : "" ) ) );
		return rows;
	}

	/**
	 * Clears the screen above the message box and the terminal's scrollback, so the next output starts on an empty screen. Only what is drawn
	 * goes: the conversation, the agent's memory and what is typed in the box are left as they were. The screen is cleared by printing as many
	 * empty lines as the terminal has rows, which scrolls everything off without moving the area the box lives in, and then the scrollback is
	 * erased with {@code ESC [ 3 J}.
	 */
	public void clearScreen() {
		int rows = terminal.getSize().getRows() > 0 ? terminal.getSize().getRows() : 24;
		for ( int i = 0; i < rows; i++ ) {
			runner.println( "" );
		}
		terminal.writer().print( "\u001b[3J" );
		terminal.writer().flush();
	}

	/**
	 * Shows the settings as a panel in the live area and waits until it is closed. A value is changed with the arrow keys and saved, after
	 * asking once for each file, for this agent or for every agent. The chat uses the new value from then on where it can: the header and
	 * {@code fullscreen} are about how the chat opens, so they apply the next time.
	 */
	public void showSettings() {
		SettingsPanel panel = new SettingsPanel( settings, agentFile, userFile, savedTo );
		while ( true ) {
			int room = terminal.getSize().getRows() > 0 ? terminal.getSize().getRows() : 24;
			draw( panel.rows( theme, runner.width(), Math.min( TuiSettings.ALL.size() + 12, room - 2 ) ) );
			Event ev = runner.pollEvent( Duration.ofMillis( 150 ) );
			if ( ev instanceof KeyEvent k ) {
				SettingsPanel.Outcome outcome = panel.key( k );
				if ( outcome == SettingsPanel.Outcome.CLOSE ) {
					return;
				}
				if ( outcome == SettingsPanel.Outcome.CHANGE || outcome == SettingsPanel.Outcome.RESET ) {
					SettingsPanel.Change	c	= panel.pending();
					String					said;
					try {
						said = c.value() == null ? resetSetting( c.setting().name(), c.global() ? "global" : "agent" )
						    : changeSetting( c.setting().name(), c.value(), c.global() ? "global" : "agent" );
					} catch ( IllegalArgumentException e ) {
						said = e.getMessage();
					}
					panel.refresh( settings, said );
				}
			}
		}
	}

	/**
	 * Changes one setting and saves it, for this agent or for every agent, and uses the new value from now on where the chat can
	 *
	 * @param name  the setting
	 * @param value the new value, as it would be written in a file
	 * @param scope {@code agent} for this agent's own file, {@code global} for the person's file for every agent
	 *
	 * @return a sentence for the person: what was saved, where, and whether it applies now
	 *
	 * @throws IllegalArgumentException when the setting is not known, the value is not one it takes, or there is no file to save to
	 */
	public String changeSetting( String name, String value, String scope ) {
		TuiSettings.Setting setting = TuiSettings.find( name );
		if ( setting == null ) {
			throw new IllegalArgumentException( "There is no setting [" + name + "]. The settings are " + TuiSettings.names() );
		}
		String normal = TuiSettings.normalize( setting, value );
		if ( normal == null ) {
			throw new IllegalArgumentException( setting.name() + " takes " + setting.allowed() + ", not [" + value + "]" );
		}
		boolean	global	= "global".equals( scope );
		String	file	= global ? userFile : agentFile;
		if ( file.isEmpty() ) {
			throw new IllegalArgumentException( "There is no agent file here, so use the global scope to save for every agent" );
		}
		try {
			TuiSettingsWriter.set( Path.of( file ), setting.name(), normal );
		} catch ( IOException e ) {
			throw new IllegalArgumentException( e.getMessage() );
		}
		settings = settings.with( global ? TuiSettings.USER : TuiSettings.AGENT, setting.name(), normal );
		return applied( setting, normal, global, file );
	}

	/**
	 * Takes one setting out of a settings file, so the layer below it applies again
	 *
	 * @param name  the setting
	 * @param scope {@code agent} or {@code global}
	 *
	 * @return a sentence for the person
	 *
	 * @throws IllegalArgumentException when the setting is not known or there is no file
	 */
	public String resetSetting( String name, String scope ) {
		TuiSettings.Setting setting = TuiSettings.find( name );
		if ( setting == null ) {
			throw new IllegalArgumentException( "There is no setting [" + name + "]. The settings are " + TuiSettings.names() );
		}
		boolean	global	= "global".equals( scope );
		String	file	= global ? userFile : agentFile;
		if ( file.isEmpty() ) {
			throw new IllegalArgumentException( "There is no agent file here, so use the global scope" );
		}
		boolean removed;
		try {
			removed = TuiSettingsWriter.remove( Path.of( file ), setting.name() );
		} catch ( IOException e ) {
			throw new IllegalArgumentException( e.getMessage() );
		}
		settings = settings.with( global ? TuiSettings.USER : TuiSettings.AGENT, setting.name(), null );
		applyNow( setting.name() );
		String now = setting.name() + " is " + settings.get( setting.name() ) + " (" + settings.source( setting.name() ) + ")";
		return removed ? setting.name() + " is no longer set in " + file + ", so it is " + now.substring( setting.name().length() + 4 )
		    : setting.name() + " was not set in " + file + ". " + now;
	}

	/**
	 * Uses a setting's new value where the chat can, and says what happened
	 *
	 * @param setting the setting
	 * @param value   its new value in the file
	 * @param global  whether it was saved for every agent
	 * @param file    the file it was saved in
	 *
	 * @return a sentence for the person
	 */
	private String applied( TuiSettings.Setting setting, String value, boolean global, String file ) {
		applyNow( setting.name() );
		String	now		= settings.get( setting.name() );
		String	saved	= "Saved " + setting.name() + ": " + value + " for " + ( global ? "every agent" : "this agent" ) + " in " + file + ".";
		if ( !now.equals( value ) ) {
			return saved + " This run keeps " + now + ", from " + settings.source( setting.name() ) + ".";
		}
		return saved + ( List.of( "fullscreen", "header" ).contains( setting.name() ) ? " It applies the next time the chat opens." : "" );
	}

	/**
	 * Makes the chat use the current value of a setting that is not read each time it is needed
	 *
	 * @param name the setting
	 */
	private void applyNow( String name ) {
		switch ( name ) {
			case "theme" :
				theme = Theme.detect( settings.get( "theme" ) );
				break;
			case "menuRows" :
				slash.setWindow( settings.integer( "menuRows" ) );
				break;
			case "terminalTitle" :
				if ( settings.bool( "terminalTitle" ) && !titleSet && !agentName.isEmpty() ) {
					terminal.writer().print( "\u001b[22;0t\u001b]2;bxAgents · " + agentName + "\u0007" );
					titleSet = true;
				} else if ( !settings.bool( "terminalTitle" ) && titleSet ) {
					terminal.writer().print( "\u001b[23;0t" );
					titleSet = false;
				}
				terminal.writer().flush();
				break;
			default :
				break;
		}
	}

	/**
	 * @return a row per setting for a listing: name, value, the layer it came from, what it may be, and what it does
	 */
	public List<Map<String, String>> settingsTable() {
		List<Map<String, String>> rows = new ArrayList<>();
		for ( TuiSettings.Setting s : TuiSettings.ALL ) {
			Map<String, String> row = new LinkedHashMap<>();
			row.put( "name", s.name() );
			row.put( "value", settings.get( s.name() ) );
			row.put( "source", settings.source( s.name() ) );
			row.put( "allowed", s.allowed() );
			row.put( "does", s.does() );
			rows.add( row );
		}
		return rows;
	}

	/**
	 * Shows the keyboard shortcuts as a panel in the live area and waits until it is closed (Esc, F1 or Ctrl+/). The keys are the ones bound
	 * now, so a person's own changes show, marked with what they were. The message box and what is typed in it are left as they were.
	 */
	public void showKeys() {
		KeysPanel panel = new KeysPanel( keys.table() );
		while ( true ) {
			int room = terminal.getSize().getRows() > 0 ? terminal.getSize().getRows() : 24;
			draw( panel.rows( theme, runner.width(), Math.min( 24, room - 2 ) ) );
			Event ev = runner.pollEvent( Duration.ofMillis( 150 ) );
			if ( ev instanceof KeyEvent k && panel.key( k ) ) {
				return;
			}
		}
	}

	/**
	 * The rows of the slash menu: the commands in view, the picked one marked, a heading above each group when nothing has been typed after
	 * the slash, and a line with the position and the keys
	 *
	 * @return The rows, none when the menu is closed
	 */
	private List<Row> slashRows() {
		List<Row> rows = new ArrayList<>();
		if ( !slash.isOpen() ) {
			return rows;
		}
		List<SlashMenu.Item>	view	= slash.window();
		int						name	= 0;
		for ( SlashMenu.Item item : view ) {
			name = Math.max( name, ( item.name() + ( item.usage().isEmpty() ? "" : " " + item.usage() ) ).length() );
		}
		name = Math.min( name, Math.max( 12, runner.width() / 2 ) );
		String group = null;
		for ( int i = 0; i < view.size(); i++ ) {
			SlashMenu.Item item = view.get( i );
			if ( slash.isGrouped() && !item.group().equals( group ) ) {
				group = item.group();
				rows.add( Row.of( "  " + group, theme.muted ) );
			}
			boolean	on		= i == slash.pickInWindow();
			String	label	= item.name() + ( item.usage().isEmpty() ? "" : " " + item.usage() );
			String	padded	= label + " ".repeat( Math.max( 0, name - label.length() ) );
			int		room	= Math.max( 10, runner.width() - name - 8 );
			rows.add( Row.of().add( on ? " ❯ " : "   ", theme.accent ).add( clip( padded, name ), on ? theme.selected : theme.plain ).add(
			    "  " + clip( item.description(), room ),
			    theme.muted ) );
		}
		rows.add( Row.of(
		    "   " + slash.position() + "/" + slash.size() + " · ↑↓ move · tab fills · enter " + ( slash.picked().runsAtOnce() ? "runs" : "fills" )
		        + " · esc closes",
		    theme.muted ) );
		return rows;
	}

	/**
	 * Builds the live-area rows shown while the agent is working.
	 *
	 * @return rows for streamed output, active tools, and the working composer
	 */
	private List<Row> turnRows() {
		List<Row>	rows	= new ArrayList<>();
		int			width	= Math.max( 20, runner.width() - 4 );
		if ( segment.length() > 0 ) {
			for ( String l : Wrap.tail( segment.toString(), width, MAX_TAIL ) ) {
				rows.add( Row.of( "  " + l, theme.plain ) );
			}
		} else if ( reasoning.length() > 0 && running.isEmpty() && "show".equals( settings.get( "thinking" ) ) ) {
			List<String> t = Wrap.tail( reasoning.toString().replace( '\n', ' ' ), width - 12, 1 );
			rows.add( Row.of().add( "  thinking  ", theme.muted ).add( t.get( 0 ), theme.muted ) );
		}
		String spin = spinner();
		for ( Map<?, ?> t : running.values() ) {
			Row		r		= Row.of().add( " " + spin + " ", theme.accent ).add( String.valueOf( get( t, "name" ) ), theme.bold );
			String	summary	= String.valueOf( get( t, "summary" ) );
			if ( !summary.isEmpty() && !summary.equals( "null" ) ) {
				r.add( "  " + clip( summary, Math.max( 10, runner.width() - 30 ) ), theme.muted );
			}
			rows.add( r );
		}
		long secs = ( System.currentTimeMillis() - turnStarted ) / 1000;
		rows.addAll( promptRows( true, spin + " " + ( cancel ? "stopping" : "working" ) + " " + secs + "s",
		    lower( keys.first( KeyMap.Action.STOP ) ) + " stops · enter steers" ) );
		return rows;
	}

	/** The pictures taken off the clipboard are copies in a temporary folder; they go when the chat does. */
	private void forgetPastedPictures() {
		if ( pasteFolder == null ) {
			return;
		}
		try ( var stream = Files.list( pasteFolder ) ) {
			stream.forEach( f -> f.toFile().delete() );
			Files.deleteIfExists( pasteFolder );
		} catch ( IOException e ) {
			// a temporary folder left behind is cleaned by the system
		}
	}

	/** the prompt, drawn in the chosen style: from its top edge to its hint line */
	private List<Row> promptRows( boolean working, String label, String hint ) {
		int				first	= Math.max( 0, composer.rowCount() - MAX_COMPOSER );
		List<String>	lines	= new ArrayList<>();
		for ( int i = first; i < composer.rowCount(); i++ ) {
			lines.add( composer.line( i ) );
		}
		PromptLook	now		= look;
		PromptState	state	= new PromptState( lines, composer.caretRow() - first, composer.caretCol(), working, label, widgetTexts( now.top() ),
		    widgetTexts( now.bottom() ), hint, tap.isRecording(), Math.max( 20, runner.width() - 1 ) );
		return PromptStyles.getOrDefault( now.style() ).rows( state, theme );
	}

	/** the text of each named widget that has something to show */
	private List<String> widgetTexts( List<String> names ) {
		List<String> out = new ArrayList<>();
		for ( String name : names ) {
			Widget w = Widgets.get( name );
			if ( w != null ) {
				String text = w.text( facts );
				if ( !text.isEmpty() ) {
					out.add( text );
				}
			}
		}
		return out;
	}

	/**
	 * Limits the live area to the terminal height and paints the visible rows.
	 *
	 * @param rows complete live-area content to draw
	 */
	private void draw( List<Row> rows ) {
		// The most the area may take is what the terminal has, not what the area has now (runner.height() is the area), or it could never
		// grow past its first rows and the slash menu and the @ menu would be cut off above the box
		int			room	= terminal.getSize().getRows() > 0 ? terminal.getSize().getRows() : 24;
		int			height	= Math.min( rows.size(), Math.max( 4, room - 2 ) );
		List<Row>	shown	= rows.subList( rows.size() - height, rows.size() );
		if ( height < drawnHeight ) {
			// The area gives up rows when it shrinks (the slash menu closing) and the terminal keeps whatever was
			// on them, so paint the new rows into the old, taller area first: that blanks the rows being given up.
			paint( shown );
		}
		runner.setContentHeight( height );
		paint( shown );
		drawnHeight = height;
	}

	/**
	 * Draws the visible live-area rows into the TUI frame.
	 *
	 * @param shown rows that fit in the live area
	 */
	private void paint( List<Row> shown ) {
		runner.draw( ( Frame f ) -> {
			int w = f.area().width();
			for ( int y = 0; y < shown.size(); y++ ) {
				shown.get( y ).draw( f.buffer(), 0, y, w );
			}
		} );
	}

	/**
	 * Replaces newlines with spaces and truncates text to a maximum character count.
	 *
	 * @param s   text to clip
	 * @param max maximum number of characters to return
	 *
	 * @return flattened text, clipped with an ellipsis when needed
	 */
	private static String clip( String s, int max ) {
		String one = s.replace( '\n', ' ' );
		return one.length() <= max ? one : one.substring( 0, Math.max( 0, max - 1 ) ) + "…";
	}

	/**
	 * Reads a map entry by exact key or by a case-insensitive key match.
	 *
	 * @param m    map to search
	 * @param name requested key
	 *
	 * @return matching value, or {@code null} if the key is absent
	 */
	private static Object get( Map<?, ?> m, String name ) {
		Object v = m.get( name );
		if ( v != null ) {
			return v;
		}
		for ( Map.Entry<?, ?> e : m.entrySet() ) {
			if ( String.valueOf( e.getKey() ).equalsIgnoreCase( name ) ) {
				return e.getValue();
			}
		}
		return null;
	}

	/**
	 * Starts recording what the terminal shows into an asciicast file. One already on is finished first.
	 *
	 * @param file  absolute path of the .cast file to write
	 * @param title shown by players
	 *
	 * @return the file being written
	 *
	 * @throws IOException when the file cannot be created
	 */
	public String startRecording( String file, String title ) throws IOException {
		Path path = Path.of( file );
		tap.start( path, title );
		return path.toString();
	}

	/**
	 * Finishes the recording, if one is on.
	 *
	 * @return the file that was written, or an empty string when no recording was on
	 */
	public String stopRecording() {
		Path path = tap.stop();
		return path == null ? "" : path.toString();
	}

	/**
	 * @return true while a recording is on
	 */
	public boolean isRecording() {
		return tap.isRecording();
	}

	/**
	 * @return the file being written, or an empty string
	 */
	public String recordingFile() {
		Path path = tap.file();
		return path == null ? "" : path.toString();
	}

	/**
	 * @return what stopped the recording early, or an empty string while it is healthy
	 */
	public String recordingError() {
		String error = tap.error();
		return error == null ? "" : error;
	}

	/**
	 * Stops turn drawing, removes temporary pasted images, closes the TUI and recording terminal, and restores the previous context class loader.
	 */
	@Override
	public void close() {
		turnOver = true;
		forgetPastedPictures();
		if ( titleSet ) {
			terminal.writer().print( "\u001b[23;0t" );
			terminal.writer().flush();
		}
		try {
			runner.close();
		} finally {
			try {
				tap.stop();
				terminal.close();
			} catch ( IOException e ) {
				// the terminal is gone either way
			} finally {
				Thread.currentThread().setContextClassLoader( previousLoader );
			}
		}
	}

}
