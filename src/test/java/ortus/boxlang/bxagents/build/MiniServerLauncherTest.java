package ortus.boxlang.bxagents.build;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

public class MiniServerLauncherTest {

	@DisplayName( "findExecutable() returns null when boxlang-miniserver is in none of the folders it is given" )
	@Test
	public void testFindExecutableNotFound( @org.junit.jupiter.api.io.TempDir Path empty ) {
		// The folders are given, not read from the machine's PATH: a runner that has the binary installed (the CI one has
		// /usr/local/bin/boxlang-miniserver) would otherwise make this fail.
		assertNull( MiniServerLauncher.findExecutable( empty.toString() ) );
		assertNull( MiniServerLauncher.findExecutable( "" ) );
		assertNull( MiniServerLauncher.findExecutable( null ) );
	}

	@DisplayName( "findExecutable() finds an executable boxlang-miniserver in one of the folders, and skips a file that is not executable" )
	@Test
	public void testFindExecutableFound( @org.junit.jupiter.api.io.TempDir Path dir ) throws Exception {
		assumeTrue( !System.getProperty( "os.name", "" ).toLowerCase().contains( "win" ), "needs the executable bit" );
		Path	plain	= Files.createDirectory( dir.resolve( "plain" ) );
		Path	bin		= Files.createDirectory( dir.resolve( "bin" ) );
		Files.writeString( plain.resolve( "boxlang-miniserver" ), "not executable\n" );
		Path exe = bin.resolve( "boxlang-miniserver" );
		Files.writeString( exe, "#!/bin/sh\n" );
		exe.toFile().setExecutable( true );

		String found = MiniServerLauncher.findExecutable( plain + java.io.File.pathSeparator + bin );

		assertEquals( exe.toAbsolutePath().toString(), found );
	}

	@DisplayName( "launch() throws a clear error when the executable path does not exist" )
	@Test
	public void testLaunchMissingExecutable() {
		assertThrows( RuntimeException.class, () -> {
			MiniServerLauncher.launch( "/nonexistent/boxlang-miniserver", "/nonexistent/miniserver.json", false );
		} );
	}

	@DisplayName( "launch() hands the extra environment variables to the child process" )
	@Test
	public void testLaunchPassesEnvironment( @org.junit.jupiter.api.io.TempDir Path dir ) throws Exception {
		assumeTrue( !System.getProperty( "os.name", "" ).toLowerCase().contains( "win" ), "needs /bin/sh" );
		Path	out		= dir.resolve( "out.txt" );
		Path	script	= dir.resolve( "probe.sh" );
		Files.writeString( script, "echo \"$BXAGENTS_TEST_VAR\" > \"" + out + "\"\n" );

		Process process = MiniServerLauncher.launch( "/bin/sh", script.toString(), false, java.util.Map.of( "BXAGENTS_TEST_VAR", "from-launcher" ) );
		assertEquals( 0, process.waitFor() );
		assertEquals( "from-launcher", Files.readString( out ).trim() );
	}

	/**
	 * Finds the boxlang-miniserver jar fetched by the `downloadBoxLang`
	 * Gradle task into src/test/resources/libs/boxlang-miniserver-*.jar.
	 */
	private static Path findMiniServerJar() throws IOException {
		Path libsDir = Path.of( "src/test/resources/libs" );
		if ( !Files.isDirectory( libsDir ) ) {
			return null;
		}
		try ( DirectoryStream<Path> stream = Files.newDirectoryStream( libsDir, "boxlang-miniserver-*.jar" ) ) {
			for ( Path candidate : stream ) {
				return candidate;
			}
		}
		return null;
	}

	@DisplayName( "launch() boots a real boxlang-miniserver jar and serves a request" )
	@Test
	public void testLaunchJar() throws Exception {
		Path jarPath = findMiniServerJar();
		assumeTrue( jarPath != null, "boxlang-miniserver jar not found - run `./gradlew downloadBoxLang` first" );

		Path tempDir = Files.createTempDirectory( "bxagents-miniserver-launch-test-" );
		Path webRoot = tempDir.resolve( "webroot" );
		Files.createDirectories( webRoot );
		Files.writeString( webRoot.resolve( "index.bxm" ), "<bx:script>writeOutput(\"ok\");</bx:script>" );

		int		port		= 39218;
		Path	configPath	= tempDir.resolve( "miniserver.json" );
		Files.writeString( configPath, """
		                                {
		                                  "port": %d,
		                                  "host": "127.0.0.1",
		                                  "webRoot": "%s",
		                                  "rewrites": true,
		                                  "rewriteFileName": "index.bxm",
		                                  "healthCheck": true
		                                }
		                                """.formatted( port, webRoot.toString().replace( "\\", "\\\\" ) ) );

		Process process = MiniServerLauncher.launch( jarPath.toAbsolutePath().toString(), configPath.toAbsolutePath().toString(), false );
		try {
			HttpClient		client	= HttpClient.newHttpClient();
			HttpResponse<String> response = pollUntilUp( client, "http://127.0.0.1:" + port + "/", Duration.ofSeconds( 20 ) );

			assertEquals( 200, response.statusCode() );
			assertEquals( "ok", response.body() );
		} finally {
			process.destroy();
			process.waitFor( 5, java.util.concurrent.TimeUnit.SECONDS );
			if ( process.isAlive() ) {
				process.destroyForcibly();
			}
		}
	}

	/**
	 * Polls until a real 200 comes back - NOT just until any HTTP response
	 * comes back. While the server process is still starting, a request can
	 * get a transient 502 back instead of a connection-refused exception
	 * (this sandbox's outbound-HTTP proxy answers for a not-yet-listening
	 * localhost port rather than letting the TCP-level refusal propagate) -
	 * confirmed empirically against this same jar in this session.
	 */
	private static HttpResponse<String> pollUntilUp( HttpClient client, String url, Duration timeout ) throws Exception {
		long deadline = System.currentTimeMillis() + timeout.toMillis();
		HttpRequest request = HttpRequest.newBuilder( URI.create( url ) ).timeout( Duration.ofSeconds( 2 ) ).GET().build();

		Exception				last		= null;
		HttpResponse<String>	lastResponse	= null;
		while ( System.currentTimeMillis() < deadline ) {
			try {
				lastResponse = client.send( request, HttpResponse.BodyHandlers.ofString() );
				if ( lastResponse.statusCode() == 200 ) {
					return lastResponse;
				}
			} catch ( Exception e ) {
				last = e;
			}
			Thread.sleep( 500 );
		}
		if ( lastResponse != null ) {
			return lastResponse;
		}
		throw new RuntimeException( "boxlang-miniserver never came up at [" + url + "]", last );
	}

}
