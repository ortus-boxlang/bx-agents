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

import static com.google.common.truth.Truth.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import dev.tamboui.tui.event.KeyEvent;

/**
 * The message box's {@code @} files and the clipboard picture, without a terminal or a clipboard.
 */
@DisplayName( "Files and pictures in the message box" )
class AttachmentsTest {

	private static final byte[] PNG = { ( byte ) 0x89, 'P', 'N', 'G', 13, 10, 26, 10, 0 };

	private static void type( Composer c, String text ) {
		for ( char ch : text.toCharArray() ) {
			c.key( KeyEvent.ofChar( ch ) );
		}
	}

	private static void touch( Path root, String rel ) throws IOException {
		Path file = root.resolve( rel );
		Files.createDirectories( file.getParent() );
		Files.writeString( file, "x" );
	}

	@Test
	@DisplayName( "FileIndex lists files below the folder, not the folders nobody means to mention" )
	void indexSkipsNoise( @TempDir Path root ) throws IOException {
		touch( root, "README.md" );
		touch( root, "src/app.bx" );
		touch( root, "src/util/strings.bx" );
		touch( root, ".git/config" );
		touch( root, "node_modules/lib/index.js" );
		touch( root, "build/out.txt" );
		touch( root, ".hidden" );
		FileIndex index = new FileIndex( root );
		index.refresh();

		assertThat( index.match( "", 50 ) ).containsExactly( "README.md", "src/app.bx", "src/util/strings.bx" ).inOrder();
	}

	@Test
	@DisplayName( "FileIndex ranks file names that start with the query, then paths that do, then the rest" )
	void indexRanks( @TempDir Path root ) throws IOException {
		touch( root, "docs/app-notes.md" );
		touch( root, "src/app.bx" );
		touch( root, "app/main.bx" );
		touch( root, "lib/webapp.bx" );
		FileIndex index = new FileIndex( root );
		index.refresh();

		assertThat( index.match( "app", 10 ) ).containsExactly( "src/app.bx", "docs/app-notes.md", "app/main.bx", "lib/webapp.bx" ).inOrder();
		assertThat( index.match( "APP", 2 ) ).hasSize( 2 );
		assertThat( index.match( "zzz", 10 ) ).isEmpty();
	}

	@Test
	@DisplayName( "FileIndex stops at its limit and does not walk too deep" )
	void indexLimits( @TempDir Path root ) throws IOException {
		touch( root, "a/b/c/d/e/f/too-deep.txt" );
		touch( root, "a/b/c/d/e/seen.txt" );
		FileIndex index = new FileIndex( root );
		index.refresh();
		assertThat( index.match( "", 50 ) ).containsExactly( "a/b/c/d/e/seen.txt" );
	}

	@Test
	@DisplayName( "Composer finds the @ mention at the caret, and not an at sign inside a word" )
	void composerFindsMention() {
		Composer c = new Composer();
		type( c, "look at @sr" );
		assertThat( c.atQuery() ).isEqualTo( "sr" );

		Composer mail = new Composer();
		type( mail, "mail bob@exa" );
		assertThat( mail.atQuery() ).isNull();

		Composer none = new Composer();
		type( none, "no mention here" );
		assertThat( none.atQuery() ).isNull();

		Composer closed = new Composer();
		type( closed, "@src/app.bx and more" );
		assertThat( closed.atQuery() ).isNull();

		Composer start = new Composer();
		type( start, "@" );
		assertThat( start.atQuery() ).isEmpty();
	}

	@Test
	@DisplayName( "Composer completes a mention with the path, quoted when it has a space, and goes on typing after it" )
	void composerCompletesMention() {
		Composer c = new Composer();
		type( c, "explain @sr" );
		c.replaceAtMention( "src/app.bx" );
		assertThat( c.text() ).isEqualTo( "explain @src/app.bx " );
		type( c, "please" );
		assertThat( c.text() ).isEqualTo( "explain @src/app.bx please" );

		Composer spaced = new Composer();
		type( spaced, "@my" );
		spaced.replaceAtMention( "my notes.txt" );
		assertThat( spaced.text() ).isEqualTo( "@\"my notes.txt\" " );
	}

	@Test
	@DisplayName( "ClipboardImage tries wl-paste then xclip on Wayland, and takes the first PNG" )
	void clipboardOnWayland( @TempDir Path folder ) {
		List<List<String>> tried = new ArrayList<>();
		ClipboardImage clip = new ClipboardImage( "Linux", Map.of( "WAYLAND_DISPLAY", "wayland-0" ), command -> {
			tried.add( command );
			if ( command.get( 0 ).equals( "wl-paste" ) ) {
				return PNG;
			}
			throw new IOException( "not installed" );
		} );

		Optional<Path> saved = clip.save( folder );

		assertThat( saved.isPresent() ).isTrue();
		assertThat( tried ).hasSize( 1 );
		assertThat( tried.get( 0 ) ).containsAtLeast( "wl-paste", "image/png" );
		assertThat( Files.exists( saved.get() ) ).isTrue();
	}

	@Test
	@DisplayName( "ClipboardImage falls back to xclip on X11, and gives nothing when no tool has a picture" )
	void clipboardOnX11( @TempDir Path folder ) {
		ClipboardImage withXclip = new ClipboardImage( "Linux", Map.of(), command -> {
			if ( command.get( 0 ).equals( "xclip" ) ) {
				return PNG;
			}
			throw new IOException( "not installed" );
		} );
		assertThat( withXclip.save( folder ).isPresent() ).isTrue();

		// text on the clipboard comes back as something that is not a PNG
		ClipboardImage text = new ClipboardImage( "Linux", Map.of(), command -> "just words".getBytes() );
		assertThat( text.save( folder ).isPresent() ).isFalse();

		ClipboardImage none = new ClipboardImage( "Linux", Map.of(), command -> {
			throw new IOException( "not installed" );
		} );
		assertThat( none.save( folder ).isPresent() ).isFalse();
	}

	@Test
	@DisplayName( "ClipboardImage picks the tool of the system: pngpaste and AppleScript on macOS, PowerShell on Windows" )
	void clipboardPerSystem( @TempDir Path folder ) {
		Path target = folder.resolve( "x.png" );
		List<List<String>> mac = new ClipboardImage( "Mac OS X", Map.of(), c -> new byte[ 0 ] ).commands( target );
		assertThat( mac.get( 0 ) ).containsExactly( "pngpaste", "-" ).inOrder();
		assertThat( mac.get( 1 ).get( 0 ) ).isEqualTo( "osascript" );
		assertThat( String.join( " ", mac.get( 1 ) ) ).contains( target.toString() );

		List<List<String>> windows = new ClipboardImage( "Windows 11", Map.of(), c -> new byte[ 0 ] ).commands( target );
		assertThat( windows ).hasSize( 1 );
		assertThat( windows.get( 0 ).get( 0 ) ).isEqualTo( "powershell" );
		assertThat( windows.get( 0 ).get( 3 ) ).contains( "GetImage" );
	}

	@Test
	@DisplayName( "ClipboardImage only believes a PNG" )
	void pngMagic() {
		assertThat( ClipboardImage.isPng( PNG ) ).isTrue();
		assertThat( ClipboardImage.isPng( new byte[] { 1, 2, 3, 4, 5 } ) ).isFalse();
		assertThat( ClipboardImage.isPng( new byte[ 0 ] ) ).isFalse();
	}
}
