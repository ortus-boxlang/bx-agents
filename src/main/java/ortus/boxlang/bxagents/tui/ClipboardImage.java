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
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

/**
 * Reads a picture off the operating system's clipboard, for Ctrl+V in the message box. A terminal has no
 * clipboard API, so this asks the tool each system has: {@code wl-paste} (Wayland) or {@code xclip} (X11) on Linux,
 * {@code pngpaste} or AppleScript on macOS, PowerShell on Windows. The first that hands back a PNG wins; a system
 * with none of them, or a clipboard with no picture, gives nothing.
 *
 * The running of a command is a function handed in, so the choice of command and the reading of its answer test
 * without a clipboard.
 */
final class ClipboardImage {

	private static final byte[]	PNG	= { ( byte ) 0x89, 'P', 'N', 'G' };

	/** Runs a command and returns what it wrote to standard output; throws when it cannot be run or fails. */
	@FunctionalInterface
	interface Runner {

		byte[] run( List<String> command ) throws IOException;
	}

	private final String				os;
	private final java.util.Map<String, String>	env;
	private final Runner				runner;

	ClipboardImage( String os, java.util.Map<String, String> env, Runner runner ) {
		this.os		= os.toLowerCase( java.util.Locale.ROOT );
		this.env	= env;
		this.runner	= runner;
	}

	/** The real thing: this machine's system, its environment, and the programs it has. */
	static ClipboardImage ofThisMachine() {
		return new ClipboardImage( System.getProperty( "os.name", "" ), System.getenv(), ClipboardImage::runProcess );
	}

	/**
	 * @param folder where to keep the picture
	 *
	 * @return the PNG file made from the clipboard, or empty when there is no picture on it
	 */
	Optional<Path> save( Path folder ) {
		try {
			Files.createDirectories( folder );
		} catch ( IOException e ) {
			return Optional.empty();
		}
		Path target = folder.resolve( "clipboard-" + System.currentTimeMillis() + ".png" );
		for ( List<String> command : commands( target ) ) {
			try {
				byte[] out = runner.run( command );
				if ( command.get( 0 ).equals( "osascript" ) || command.get( 0 ).equals( "powershell" ) ) {
					// these write the file themselves and say "ok"
					if ( new String( out, java.nio.charset.StandardCharsets.UTF_8 ).trim().equals( "ok" ) && isPng( Files.readAllBytes( target ) ) ) {
						return Optional.of( target );
					}
				} else if ( isPng( out ) ) {
					Files.write( target, out );
					return Optional.of( target );
				}
			} catch ( IOException e ) {
				// the tool is not there, or had no picture: try the next
			}
		}
		return Optional.empty();
	}

	/** The commands to try on this system, in order. */
	List<List<String>> commands( Path target ) {
		List<List<String>> out = new ArrayList<>();
		if ( os.contains( "mac" ) || os.contains( "darwin" ) ) {
			out.add( List.of( "pngpaste", "-" ) );
			out.add( List.of( "osascript",
			    "-e", "try",
			    "-e", "set png to (the clipboard as «class PNGf»)",
			    "-e", "set f to open for access POSIX file \"" + target + "\" with write permission",
			    "-e", "set eof f to 0",
			    "-e", "write png to f",
			    "-e", "close access f",
			    "-e", "return \"ok\"",
			    "-e", "on error",
			    "-e", "return \"none\"",
			    "-e", "end try" ) );
		} else if ( os.contains( "win" ) ) {
			out.add( List.of( "powershell", "-NoProfile", "-Command",
			    "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; "
			        + "$i = [System.Windows.Forms.Clipboard]::GetImage(); if ($i) { $i.Save('" + target + "', [System.Drawing.Imaging.ImageFormat]::Png); 'ok' } else { 'none' }" ) );
		} else {
			if ( env.get( "WAYLAND_DISPLAY" ) != null ) {
				out.add( List.of( "wl-paste", "--no-newline", "--type", "image/png" ) );
			}
			out.add( List.of( "xclip", "-selection", "clipboard", "-t", "image/png", "-o" ) );
			if ( env.get( "WAYLAND_DISPLAY" ) == null ) {
				out.add( List.of( "wl-paste", "--no-newline", "--type", "image/png" ) );
			}
		}
		return out;
	}

	static boolean isPng( byte[] bytes ) {
		if ( bytes.length < PNG.length ) {
			return false;
		}
		for ( int i = 0; i < PNG.length; i++ ) {
			if ( bytes[ i ] != PNG[ i ] ) {
				return false;
			}
		}
		return true;
	}

	private static byte[] runProcess( List<String> command ) throws IOException {
		Process p = new ProcessBuilder( command ).redirectErrorStream( false ).redirectError( ProcessBuilder.Redirect.DISCARD ).start();
		try {
			byte[] out = p.getInputStream().readAllBytes();
			if ( !p.waitFor( 5, TimeUnit.SECONDS ) ) {
				p.destroyForcibly();
				throw new IOException( "timed out" );
			}
			if ( p.exitValue() != 0 ) {
				throw new IOException( "exit " + p.exitValue() );
			}
			return out;
		} catch ( InterruptedException e ) {
			Thread.currentThread().interrupt();
			p.destroyForcibly();
			throw new IOException( "interrupted" );
		}
	}
}
