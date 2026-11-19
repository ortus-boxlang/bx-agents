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

import java.time.Duration;
import java.util.List;

import dev.tamboui.terminal.Frame;
import dev.tamboui.tui.TuiConfig;
import dev.tamboui.tui.TuiRunner;
import dev.tamboui.tui.event.Event;
import dev.tamboui.tui.event.KeyEvent;

/**
 * `bxAgents logs --ui`: the {@link LogView} on the whole terminal. BoxLang runs the loop: {@link #step(int)} draws and
 * waits for a key for a moment, and says whether the person left or changed the log, the level or the search, so the
 * lines can be read again; between steps BoxLang adds the lines written since ({@link #append(List, int)}).
 */
public final class LogScreen implements AutoCloseable {

	private final TuiRunner		runner;
	private final LogView		view;
	private final ClassLoader	previousLoader;

	/**
	 * @param runner         the full-screen runner that owns the terminal
	 * @param view           what is drawn
	 * @param previousLoader the thread's class loader before {@link #open(List, String)} swapped it, put back by {@link #close()}
	 */
	private LogScreen( TuiRunner runner, LogView view, ClassLoader previousLoader ) {
		this.runner			= runner;
		this.view			= view;
		this.previousLoader	= previousLoader;
	}

	/**
	 * Takes over the terminal.
	 *
	 * @param areas the logs, in the order of the tabs
	 * @param open  the log to open first
	 *
	 * @return the open screen
	 *
	 * @throws Exception when the terminal cannot be put in raw mode
	 */
	public static LogScreen open( List<?> areas, String open ) throws Exception {
		// see TuiScreen.open(): JLine finds its terminal providers through this loader
		ClassLoader	own		= LogScreen.class.getClassLoader();
		ClassLoader	before	= Thread.currentThread().getContextClassLoader();
		Thread.currentThread().setContextClassLoader( own );
		try {
			TuiRunner runner = TuiRunner.create( TuiConfig.builder().build() );
			return new LogScreen( runner, new LogView( Theme.detect(), areas, open ), before );
		} catch ( Exception | Error e ) {
			Thread.currentThread().setContextClassLoader( before );
			throw e;
		}
	}

	/**
	 * Draws, then waits up to `waitMs` for a key and acts on it.
	 *
	 * @param waitMs how long to wait for a key
	 *
	 * @return "quit" when the person left, "changed" when the log, the level or the search changed, else ""
	 */
	public String step( int waitMs ) {
		runner.draw( this::paint );
		Event ev = runner.pollEvent( Duration.ofMillis( Math.max( 10, waitMs ) ) );
		if ( ev instanceof KeyEvent k ) {
			view.key( k );
		}
		if ( view.isDone() ) {
			return "quit";
		}
		return view.takeChange() ? "changed" : "";
	}

	/**
	 * Draws the view's rows on the whole frame.
	 *
	 * @param frame the frame of this draw
	 */
	private void paint( Frame frame ) {
		int			w		= frame.area().width();
		int			h		= frame.area().height();
		List<Row>	rows	= view.render( w, h );
		for ( int y = 0; y < rows.size() && y < h; y++ ) {
			rows.get( y ).draw( frame.buffer(), 0, y, w );
		}
	}

	/** @return the open log */
	public String area() {
		return view.area();
	}

	/** @return the level filter: blank, warn or error */
	public String level() {
		return view.level();
	}

	/** @return the search */
	public String query() {
		return view.query();
	}

	/** @param lines the lines of the open log, oldest first, replacing the shown ones */
	public void setLines( List<?> lines ) {
		view.setLines( lines );
	}

	/**
	 * @param lines new lines, oldest first
	 * @param cap   how many to keep
	 */
	public void append( List<?> lines, int cap ) {
		view.append( lines, cap );
	}

	/** @param text a short note for the header: live, or why the log could not be read */
	public void status( String text ) {
		view.status( text );
	}

	/**
	 * Leaves the full screen and puts the thread's class loader back.
	 */
	@Override
	public void close() {
		try {
			runner.close();
		} finally {
			Thread.currentThread().setContextClassLoader( previousLoader );
		}
	}

}
