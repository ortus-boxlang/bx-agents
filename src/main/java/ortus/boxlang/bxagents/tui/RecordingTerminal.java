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
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
import java.nio.file.Path;

import org.jline.terminal.Terminal;

/**
 * A JLine terminal that can copy everything drawn on it into a {@link CastRecorder}, started and stopped at any
 * time. It hands the screen a stand-in for the real terminal; the stand-in passes every call on and, while a
 * recording is on, also feeds what was written (and any window resize) to the recorder.
 * <p>
 * Nothing changes while no recording is on: the bytes go straight through.
 */
public final class RecordingTerminal {

	private final Terminal			real;
	private final Terminal			stand;
	private volatile CastRecorder	recorder;

	private RecordingTerminal( Terminal real ) {
		this.real = real;
		Tee			tee			= new Tee( real.output() );
		PrintWriter	teeWriter	= new PrintWriter( new OutputStreamWriter( tee, real.encoding() ) );
		this.stand = ( Terminal ) Proxy.newProxyInstance( Terminal.class.getClassLoader(), new Class<?>[] { Terminal.class }, ( proxy, method, args ) -> {
			switch ( method.getName() ) {
				case "output" :
					return tee;
				case "writer" :
					return teeWriter;
				case "handle" :
					Terminal.Signal signal = ( Terminal.Signal ) args[ 0 ];
					Terminal.SignalHandler handler = ( Terminal.SignalHandler ) args[ 1 ];
					if ( signal == Terminal.Signal.WINCH ) {
						return real.handle( signal, s -> {
							CastRecorder r = recorder;
							if ( r != null ) {
								r.resize( real.getWidth(), real.getHeight() );
							}
							handler.handle( s );
						} );
					}
					return real.handle( signal, handler );
				default :
					try {
						return method.invoke( real, args );
					} catch ( InvocationTargetException e ) {
						throw e.getCause();
					}
			}
		} );
	}

	/**
	 * @param real the terminal to draw on
	 */
	public static RecordingTerminal wrap( Terminal real ) {
		return new RecordingTerminal( real );
	}

	/**
	 * @return the terminal to hand to the screen in place of the real one
	 */
	public Terminal terminal() {
		return stand;
	}

	/**
	 * Starts copying what is drawn into a file. A recording already on is finished first.
	 *
	 * @param file  where it goes
	 * @param title shown by players
	 *
	 * @throws IOException when the file cannot be created
	 */
	public synchronized void start( Path file, String title ) throws IOException {
		stop();
		recorder = new CastRecorder( file, real.getWidth(), real.getHeight(), title );
	}

	/**
	 * Finishes the recording, if there is one.
	 *
	 * @return the file that was written, or null when none was on
	 */
	public synchronized Path stop() {
		CastRecorder r = recorder;
		recorder = null;
		if ( r == null ) {
			return null;
		}
		r.close();
		return r.file();
	}

	/**
	 * @return true while a recording is on
	 */
	public boolean isRecording() {
		return recorder != null;
	}

	/**
	 * @return the file being written, or null
	 */
	public Path file() {
		CastRecorder r = recorder;
		return r == null ? null : r.file();
	}

	/**
	 * @return what stopped the recording early (a full disk, say), or null
	 */
	public String error() {
		CastRecorder r = recorder;
		return r == null ? null : r.error();
	}

	/**
	 * Adds text that was printed some other way than through the terminal, such as a closing message.
	 */
	public void note( String text ) {
		CastRecorder r = recorder;
		if ( r != null ) {
			r.output( text );
		}
	}

	/** passes bytes to the real stream, then to the recorder when one is on */
	private final class Tee extends OutputStream {

		private final OutputStream real;

		Tee( OutputStream real ) {
			this.real = real;
		}

		@Override
		public void write( int b ) throws IOException {
			write( new byte[] { ( byte ) b }, 0, 1 );
		}

		@Override
		public void write( byte[] b, int off, int len ) throws IOException {
			real.write( b, off, len );
			CastRecorder r = recorder;
			if ( r != null ) {
				r.output( b, off, len );
			}
		}

		@Override
		public void flush() throws IOException {
			real.flush();
		}

	}

}
