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
import java.util.Optional;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;

import dev.tamboui.backend.jline3.JLineBackend;
import dev.tamboui.terminal.Frame;
import dev.tamboui.text.Line;
import dev.tamboui.text.Span;
import dev.tamboui.text.Text;
import dev.tamboui.tui.InlineTuiConfig;
import dev.tamboui.tui.InlineTuiRunner;
import dev.tamboui.tui.event.Event;
import dev.tamboui.tui.event.KeyCode;
import dev.tamboui.tui.event.KeyEvent;
import dev.tamboui.tui.event.PasteEvent;
import org.jline.terminal.Terminal;
import org.jline.terminal.TerminalBuilder;

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

	private static final String[]			SPINNER			= { "⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏" };
	private static final int				MAX_TAIL		= 8;
	private static final int				MAX_MENU		= 6;
	private static final int				MAX_COMPOSER	= 6;

	private final InlineTuiRunner			runner;
	private final Terminal					terminal;
	private final RecordingTerminal			tap;
	private final Theme						theme;
	private final ClassLoader				previousLoader;
	private final List<Map<?, ?>>			commands;
	private final Composer					composer		= new Composer();
	private KeyMap							keys			= KeyMap.defaults();

	private final Queue<Map<?, ?>>			events			= new ConcurrentLinkedQueue<>();
	private final Queue<String>				steer			= new ConcurrentLinkedQueue<>();
	private volatile boolean				cancel;
	/** a short note at the front of the hint row, such as the size of the context; empty for none */
	private volatile String					status			= "";
	private volatile boolean				turnOver;
	/** the look of the message box: its style and widgets; /prompt and Agent.yaml's tui: block change it */
	private volatile PromptLook				look			= PromptLook.defaults();
	private final WidgetContext				facts			= new WidgetContext();
	private Thread							turnThread;

	// pictures and file mentions in the message box
	private static final int				MAX_IMAGES		= 4;
	private final FileIndex					fileIndex		= new FileIndex( Path.of( System.getProperty( "user.dir" ) ) );
	private final ClipboardImage			clipboard		= ClipboardImage.ofThisMachine();
	private final List<String>				images			= new ArrayList<>();
	private Path							pasteFolder;
	private boolean							imagesAllowed	= true;
	private String							imagesRefusal	= "";
	private int								atPick;
	private boolean							indexed;

	// turn state, touched only by whichever thread is drawing
	private final StringBuilder				segment			= new StringBuilder();
	private final StringBuilder				reasoning		= new StringBuilder();
	private final Map<String, Map<?, ?>>	running			= new LinkedHashMap<>();
	private long							turnStarted;
	private int								frame;
	private int								drawnHeight;

	private ChatScreen( InlineTuiRunner runner, Terminal terminal, RecordingTerminal tap, Theme theme, ClassLoader previousLoader,
	    List<Map<?, ?>> commands ) {
		this.runner			= runner;
		this.terminal		= terminal;
		this.tap			= tap;
		this.theme			= theme;
		this.previousLoader	= previousLoader;
		this.commands		= commands;
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
			InlineTuiConfig		cfg			= InlineTuiConfig.builder( 3 ).clearOnClose( true ).bracketedPaste( true ).build();
			// the terminal is made here, the way the backend would make it, so a recording can be started on it
			Terminal			terminal	= TerminalBuilder.builder().system( true ).jansi( true ).build();
			RecordingTerminal	tap			= RecordingTerminal.wrap( terminal );
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
		keys = KeyMap.of( overrides );
		composer.keys( keys );
		return keys.problems();
	}

	/** @return a row per key action: id, keys, does, place (box or run), for the /keys help */
	public List<Map<String, String>> keyTable() {
		return keys.table();
	}

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
	 * Prints the heading: what the agent is, how it is reached, and the keys.
	 */
	public void banner( String agent, String model, String mode ) {
		out( Row.of().add( " bxAgents", theme.accentBold ).add( "  chat", theme.muted ).add( "   " + agent, theme.bold )
		    .add( " · " + model + " · " + mode, theme.muted ).toLine() );
		out( Row
		    .of( " " + lower( keys.first( KeyMap.Action.SUBMIT ) ) + " send · " + lower( keys.first( KeyMap.Action.NEWLINE ) )
		        + " new line · / commands · ? keys · "
		        + lower( keys.first( KeyMap.Action.STOP ) ) + " stops the agent · " + lower( keys.first( KeyMap.Action.CLEAR ) ) + " leaves", theme.muted )
		    .toLine() );
		out( Text.from( "" ) );
	}

	private void out( Line line ) {
		runner.println( Text.from( line ) );
	}

	private void out( Text text ) {
		runner.println( text );
	}

	/**
	 * Sets the status segment of the hint row under the message box, for example {@code ctx ~12.4k / 128k 9%}.
	 * It shows from the next time the box is drawn; an empty text removes it.
	 */
	public void setStatus( String text ) {
		this.status	= text == null ? "" : text;
		facts.ctx	= status;
	}

	// ----------------------------------------------------------------------------------
	// The look of the message box
	// ----------------------------------------------------------------------------------

	/**
	 * Sets the look from the {@code tui:} block of Agent.yaml: a map with {@code prompt} and {@code widgets}
	 * ({@code top} and {@code bottom} lists). What is missing keeps its default; a name that is not known is left out.
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
	 * Says whether a picture may be pasted: false, with the reason to show, for a model known not to see images.
	 */
	public void setImagesAllowed( boolean allowed, String reason ) {
		this.imagesAllowed	= allowed;
		this.imagesRefusal	= reason == null ? "" : reason;
	}

	/**
	 * Hands over the pictures pasted since the last message, as file paths, and forgets them.
	 */
	public List<String> takeImages() {
		List<String> taken = new ArrayList<>( images );
		images.clear();
		return taken;
	}

	/** Prints what the user sent. */
	public void printUser( String text ) {
		List<String> lines = Wrap.wrap( text, Math.max( 20, runner.width() - 8 ) );
		for ( int i = 0; i < lines.size(); i++ ) {
			Row r = Row.of();
			r.add( i == 0 ? " you  " : "      ", theme.accentBold );
			r.add( lines.get( i ), theme.plain );
			out( r.toLine() );
		}
		out( Text.from( "" ) );
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

	/** Prints Markdown as the agent's answer. */
	public void printMarkdown( String markdown ) {
		if ( markdown == null || markdown.isBlank() ) {
			return;
		}
		for ( Line l : MarkdownLines.render( markdown.strip(), runner.width() - 3, theme ) ) {
			out( Line.from( Span.raw( "  " ) ).append( l ) );
		}
		out( Text.from( "" ) );
	}

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
	 * @return the message, or null when the user asked to leave (Ctrl+C or Ctrl+D on an empty box)
	 */
	public String readInput() {
		while ( true ) {
			draw( idleRows() );
			Event ev = runner.pollEvent( Duration.ofMillis( 150 ) );
			if ( ev instanceof PasteEvent p ) {
				composer.paste( p.text() );
			} else if ( ev instanceof KeyEvent k ) {
				List<String> files = atMatches();
				if ( !files.isEmpty() ) {
					if ( k.isKey( KeyCode.UP ) || k.isKey( KeyCode.DOWN ) ) {
						atPick = Math.floorMod( atPick + ( k.isKey( KeyCode.DOWN ) ? 1 : -1 ), Math.min( MAX_MENU, files.size() ) );
						continue;
					}
					if ( keys.is( KeyMap.Action.COMPLETE, k ) ) {
						composer.replaceAtMention( files.get( Math.min( atPick, files.size() - 1 ) ) );
						atPick = 0;
						continue;
					}
				}
				if ( keys.is( KeyMap.Action.COMPLETE, k ) && completeSlash() ) {
					continue;
				}
				if ( keys.is( KeyMap.Action.PASTE_IMAGE, k ) ) {
					pasteImage();
					continue;
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
		return fileIndex.match( query, MAX_MENU );
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

	private boolean completeSlash() {
		List<Map<?, ?>> matches = slashMatches();
		if ( matches.isEmpty() ) {
			return false;
		}
		composer.setText( String.valueOf( get( matches.get( 0 ), "name" ) ) + " " );
		return true;
	}

	private List<Map<?, ?>> slashMatches() {
		List<Map<?, ?>>	out	= new ArrayList<>();
		String			t	= composer.text();
		if ( composer.rowCount() != 1 || !t.startsWith( "/" ) || t.contains( " " ) ) {
			return out;
		}
		for ( Map<?, ?> c : commands ) {
			if ( String.valueOf( get( c, "name" ) ).startsWith( t ) ) {
				out.add( c );
			}
		}
		return out;
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
		TextPrompt prompt = new TextPrompt( theme, title, help, "", false, "Type something, or press esc.", initial );
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
		turnStarted	= System.currentTimeMillis();
		turnThread	= new Thread( this::turnLoop, "bxagents-chat-ui" );
		turnThread.setDaemon( true );
		turnThread.start();
	}

	/** Hands the screen something the agent did. Safe to call from any thread. */
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
	}

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

	private void tool( Map<?, ?> e ) {
		String	id		= String.valueOf( get( e, "id" ) );
		String	status	= String.valueOf( get( e, "status" ) );
		if ( status.equals( "running" ) ) {
			flushSegment();
			running.put( id, e );
			return;
		}
		running.remove( id );
		boolean	ok		= status.equals( "ok" );
		Object	ms		= get( e, "ms" );
		String	took	= ms == null ? "" : String.format( "  %.1fs", Double.parseDouble( String.valueOf( ms ) ) / 1000.0 );
		Row		r		= Row.of().add( " ⚙ ", theme.muted ).add( String.valueOf( get( e, "name" ) ), theme.bold );
		String	summary	= String.valueOf( get( e, "summary" ) );
		if ( !summary.isEmpty() && !summary.equals( "null" ) ) {
			r.add( "  " + clip( summary, Math.max( 10, runner.width() - 30 ) ), theme.muted );
		}
		r.add( ok ? "  ✔" : "  ✖", ok ? theme.ok : theme.error ).add( took, theme.muted );
		out( r.toLine() );
	}

	private void flushSegment() {
		if ( segment.length() > 0 ) {
			printMarkdown( segment.toString() );
			segment.setLength( 0 );
		}
		reasoning.setLength( 0 );
	}

	// ----------------------------------------------------------------------------------
	// The live area
	// ----------------------------------------------------------------------------------

	private List<Row> idleRows() {
		List<Row>		rows	= new ArrayList<>();
		List<Map<?, ?>>	menu	= slashMatches();
		for ( int i = 0; i < Math.min( MAX_MENU, menu.size() ); i++ ) {
			Map<?, ?> c = menu.get( i );
			rows.add( Row.of().add( "   " + get( c, "name" ), i == 0 ? theme.selected : theme.plain ).add( "  " + get( c, "hint" ), theme.muted ) );
		}
		List<String> files = atMatches();
		for ( int i = 0; i < files.size(); i++ ) {
			rows.add( Row.of().add( "   @" + files.get( i ), i == Math.min( atPick, files.size() - 1 ) ? theme.selected : theme.plain ) );
		}
		String picture = images.isEmpty() ? "" : images.size() + ( images.size() == 1 ? " picture" : " pictures" ) + " attached · ";
		rows.addAll( promptRows( false, "you", picture + lower( keys.first( KeyMap.Action.SUBMIT ) ) + " send · " + lower( keys.first( KeyMap.Action.NEWLINE ) )
		    + " new line · ? keys" + ( menu.isEmpty() && files.isEmpty() ? "" : " · tab completes" ) ) );
		return rows;
	}

	private List<Row> turnRows() {
		List<Row>	rows	= new ArrayList<>();
		int			width	= Math.max( 20, runner.width() - 4 );
		if ( segment.length() > 0 ) {
			for ( String l : Wrap.tail( segment.toString(), width, MAX_TAIL ) ) {
				rows.add( Row.of( "  " + l, theme.plain ) );
			}
		} else if ( reasoning.length() > 0 && running.isEmpty() ) {
			List<String> t = Wrap.tail( reasoning.toString().replace( '\n', ' ' ), width - 12, 1 );
			rows.add( Row.of().add( "  thinking  ", theme.muted ).add( t.get( 0 ), theme.muted ) );
		}
		String spin = SPINNER[ frame % SPINNER.length ];
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

	private void draw( List<Row> rows ) {
		int			height	= Math.min( rows.size(), Math.max( 4, runner.height() - 2 ) );
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

	private void paint( List<Row> shown ) {
		runner.draw( ( Frame f ) -> {
			int w = f.area().width();
			for ( int y = 0; y < shown.size(); y++ ) {
				shown.get( y ).draw( f.buffer(), 0, y, w );
			}
		} );
	}

	private static String clip( String s, int max ) {
		String one = s.replace( '\n', ' ' );
		return one.length() <= max ? one : one.substring( 0, Math.max( 0, max - 1 ) ) + "…";
	}

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

	@Override
	public void close() {
		turnOver = true;
		forgetPastedPictures();
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
