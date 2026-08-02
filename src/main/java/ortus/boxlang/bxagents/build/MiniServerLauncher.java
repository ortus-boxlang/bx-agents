/**
 * [BoxLang]
 *
 * Copyright [2023] [Ortus Solutions, Corp]
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the
 * License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS"
 * BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
package ortus.boxlang.bxagents.build;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Launches the `boxlang-miniserver` binary (a separate standalone runtime,
 * NOT something this module boots in-process - see
 * ortus-boxlang/boxlang-miniserver) as a child process pointed at a
 * generated `miniserver.json` config - the `serve` CLI verb's real
 * implementation (M12).
 * <p>
 * This class only ever finds and starts the process; it does not wait for
 * it to exit or manage its lifecycle beyond that - the caller decides
 * whether to block, detach, or track the returned {@link Process}.
 */
public class MiniServerLauncher {

	/**
	 * Searches {@code PATH} for a `boxlang-miniserver` executable.
	 *
	 * @return The absolute path to the executable, or {@code null} if not found on PATH
	 */
	public static String findExecutable() {
		String pathEnv = System.getenv( "PATH" );
		if ( pathEnv == null || pathEnv.isBlank() ) {
			return null;
		}

		boolean	isWindows	= System.getProperty( "os.name", "" ).toLowerCase().contains( "win" );
		String	exeName		= isWindows ? "boxlang-miniserver.exe" : "boxlang-miniserver";

		for ( String dir : pathEnv.split( File.pathSeparator ) ) {
			if ( dir.isBlank() ) {
				continue;
			}
			Path candidate = Path.of( dir, exeName );
			if ( Files.isExecutable( candidate ) && !Files.isDirectory( candidate ) ) {
				return candidate.toAbsolutePath().toString();
			}
		}

		return null;
	}

	/**
	 * Starts `boxlang-miniserver` pointed at the given config file.
	 *
	 * @param executablePath Absolute path to the `boxlang-miniserver` executable (see {@link #findExecutable()})
	 * @param configPath     Absolute path to a `miniserver.json` config file
	 * @param inheritIO      When true, the child process shares this process's stdin/stdout/stderr (so server logs are visible directly)
	 *
	 * @return The started {@link Process}
	 */
	public static Process launch( String executablePath, String configPath, boolean inheritIO ) {
		try {
			ProcessBuilder builder = new ProcessBuilder( executablePath, configPath );
			if ( inheritIO ) {
				builder.inheritIO();
			}
			return builder.start();
		} catch ( IOException e ) {
			throw new RuntimeException( "Failed to launch boxlang-miniserver at [" + executablePath + "] with config [" + configPath + "]", e );
		}
	}

}
