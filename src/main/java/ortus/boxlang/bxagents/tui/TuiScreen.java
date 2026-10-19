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

import java.io.Console;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import dev.tamboui.buffer.Buffer;
import dev.tamboui.terminal.Frame;
import dev.tamboui.tui.TuiConfig;
import dev.tamboui.tui.TuiRunner;
import dev.tamboui.tui.event.Event;
import dev.tamboui.tui.event.KeyEvent;
import dev.tamboui.tui.event.PasteEvent;

/**
 * The full-screen terminal UI the `new` wizard runs in. One screen stays open
 * for the whole wizard: a header, the answers so far collapsed to a line each,
 * the question being asked, and a footer of key hints. Each question method
 * blocks until it is answered, so the BoxLang wizard reads like a script.
 *
 * Leaving a question throws {@link PromptAbort}: Esc goes back one step,
 * Ctrl+C cancels. {@link #close()} restores the terminal, and the BoxLang side
 * then prints the summary as ordinary output so it stays in the scrollback.
 *
 * TamboUI's API is still moving, so this class is the only place that touches
 * its runner; the prompts draw into plain {@link Row}s.
 */
public final class TuiScreen implements AutoCloseable {

	private static final int			MIN_PROMPT_ROWS	= 8;

	private final TuiRunner				runner;
	private final ClassLoader			previousLoader;
	private final Theme					theme;
	private final String				command;
	private final Map<String, String[]>	answers			= new LinkedHashMap<>();
	private int							step;
	private int							steps;

	private TuiScreen( TuiRunner runner, Theme theme, String command, ClassLoader previousLoader ) {
		this.previousLoader	= previousLoader;
		this.runner			= runner;
		this.theme			= theme;
		this.command		= command;
	}

	/**
	 * @return true when stdin and stdout are a real terminal that can host the UI
	 */
	public static boolean isInteractive() {
		if ( "dumb".equals( System.getenv( "TERM" ) ) ) {
			return false;
		}
		Console console = System.console();
		if ( console == null ) {
			return false;
		}
		// Java 22 made System.console() non-null even when redirected, and added isTerminal() to tell
		try {
			return ( Boolean ) Console.class.getMethod( "isTerminal" ).invoke( console );
		} catch ( ReflectiveOperationException e ) {
			return true;
		}
	}

	/**
	 * Opens the full-screen UI.
	 *
	 * @param command the verb shown in the header, for example "new"
	 *
	 * @return the open screen
	 *
	 * @throws Exception when the terminal cannot be put in raw mode
	 */
	public static TuiScreen open( String command ) throws Exception {
		// JLine finds its terminal providers (exec, ffm, jni ...) through the thread's context
		// class loader. Under BoxLang that is the runtime's loader, which cannot see this
		// module's jar, so every provider is "not found" and JLine settles for a dumb terminal
		// (measured: "Unable to find terminal provider exec"). Point it at this jar's loader for
		// as long as the screen is open.
		ClassLoader	own		= TuiScreen.class.getClassLoader();
		ClassLoader	before	= Thread.currentThread().getContextClassLoader();
		Thread.currentThread().setContextClassLoader( own );
		try {
			TuiConfig cfg = TuiConfig.builder().bracketedPaste( true ).build();
			return new TuiScreen( TuiRunner.create( cfg ), Theme.detect(), command, before );
		} catch ( Exception | Error e ) {
			Thread.currentThread().setContextClassLoader( before );
			throw e;
		}
	}

	/** @return the palette in use, so BoxLang can paint its own output to match */
	public Theme theme() {
		return theme;
	}

	/**
	 * Sets the "step n of m" shown in the header; with steps of 0 it shows "step n", for flows
	 * whose length is not known in advance.
	 *
	 * @return this screen
	 */
	public TuiScreen progress( int step, int steps ) {
		this.step	= step;
		this.steps	= steps;
		return this;
	}

	/** Remembers an answer so it shows collapsed above the next question. */
	public void record( String key, String label, String value ) {
		answers.put( key, new String[] { label, value } );
	}

	/** Drops an answer, used when the user steps back past it. */
	public void forget( String key ) {
		answers.remove( key );
	}

	public String select( String title, String help, List<?> choices, String current ) {
		return ( String ) ask( new SelectPrompt( theme, title, help, Choice.listFrom( choices ), current ) );
	}

	@SuppressWarnings( "unchecked" )
	public List<String> multiSelect( String title, String help, List<?> choices ) {
		return new ArrayList<>( ( List<String> ) ask( new MultiSelectPrompt( theme, title, help, Choice.listFrom( choices ) ) ) );
	}

	/**
	 * A question with lines of text above its choices, for the review screen.
	 */
	public String review( String title, List<?> lines, List<?> choices ) {
		List<String> preface = new ArrayList<>();
		for ( Object l : lines ) {
			preface.add( String.valueOf( l ) );
		}
		return ( String ) ask( new SelectPrompt( theme, title, "", Choice.listFrom( choices ), null, preface ) );
	}

	public String text( String title, String help, String fallback, boolean secret, String requiredMessage ) {
		return ( String ) ask( new TextPrompt( theme, title, help, fallback, secret, requiredMessage ) );
	}

	public boolean confirm( String title, String help, boolean fallback ) {
		return ( Boolean ) ask( new ConfirmPrompt( theme, title, help, fallback ) );
	}

	/** Shows lines of text and waits for Enter. */
	public void note( String title, List<?> lines ) {
		List<String> out = new ArrayList<>();
		for ( Object l : lines ) {
			out.add( String.valueOf( l ) );
		}
		ask( new NotePrompt( theme, title, out ) );
	}

	private Object ask( Prompt prompt ) {
		while ( !prompt.isDone() ) {
			runner.draw( frame -> paint( frame, prompt ) );
			Event ev = runner.pollEvent( Duration.ofMillis( 120 ) );
			if ( ev instanceof KeyEvent k ) {
				prompt.key( k );
			} else if ( ev instanceof PasteEvent p && prompt instanceof TextPrompt t ) {
				t.paste( p.text() );
			}
		}
		return prompt.result();
	}

	/**
	 * Lays out the screen. The answers collapse to one line each and the oldest
	 * drop off the top when the terminal is short, so the question always fits.
	 */
	void paint( Frame frame, Prompt prompt ) {
		Buffer	buf		= frame.buffer();
		int		w		= frame.area().width();
		int		h		= frame.area().height();

		// header
		Row		head	= Row.of().add( " bxAgents", theme.accentBold ).add( "  " + command, theme.muted );
		head.draw( buf, 0, 0, w );
		if ( step > 0 ) {
			String right = steps > 0 ? "step " + step + " of " + steps + " " : "step " + step + " ";
			Row.of( right, theme.muted ).draw( buf, Math.max( 0, w - right.length() ), 0, w );
		}

		// the prompt decides how much room it needs; answers get what is left
		int			footerRow	= h - 1;
		int			bodyTop		= 2;
		int			bodyRows	= Math.max( 1, footerRow - bodyTop );
		List<Row>	asked		= prompt.render( w - 2, Math.max( MIN_PROMPT_ROWS, bodyRows - answers.size() - 1 ) );
		int			room		= Math.max( 0, bodyRows - asked.size() - 1 );

		List<Row>	done		= new ArrayList<>();
		int			labelWidth	= 0;
		for ( String[] a : answers.values() ) {
			labelWidth = Math.max( labelWidth, a[ 0 ].length() );
		}
		for ( String[] a : answers.values() ) {
			done.add( Row.of().add( "  ✔ ", theme.ok ).add( SelectPrompt.pad( a[ 0 ], labelWidth ), theme.muted ).add( "  " + a[ 1 ], theme.plain ) );
		}
		if ( done.size() > room ) {
			done = done.subList( done.size() - room, done.size() );
		}

		int y = bodyTop;
		for ( Row r : done ) {
			r.draw( buf, 0, y++, w );
		}
		if ( !done.isEmpty() ) {
			y++;
		}
		for ( Row r : asked ) {
			if ( y >= footerRow ) {
				break;
			}
			r.draw( buf, 1, y++, w - 1 );
		}

		Row.of( " " + prompt.footer(), theme.muted ).draw( buf, 0, footerRow, w );
	}

	@Override
	public void close() {
		try {
			runner.close();
		} finally {
			Thread.currentThread().setContextClassLoader( previousLoader );
		}
	}

}
