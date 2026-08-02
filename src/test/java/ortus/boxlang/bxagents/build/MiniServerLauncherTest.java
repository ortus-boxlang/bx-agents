package ortus.boxlang.bxagents.build;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

public class MiniServerLauncherTest {

	@DisplayName( "findExecutable() returns null when boxlang-miniserver is not on PATH" )
	@Test
	public void testFindExecutableNotFound() {
		// This sandbox environment does not have boxlang-miniserver installed -
		// confirmed absent this session (no forgebox/download artifact found,
		// and building it from source requires a BoxLang 1.17.0 jar not
		// otherwise needed by this module).
		assertNull( MiniServerLauncher.findExecutable() );
	}

	@DisplayName( "launch() throws a clear error when the executable path does not exist" )
	@Test
	public void testLaunchMissingExecutable() {
		assertThrows( RuntimeException.class, () -> {
			MiniServerLauncher.launch( "/nonexistent/boxlang-miniserver", "/nonexistent/miniserver.json", false );
		} );
	}

}
