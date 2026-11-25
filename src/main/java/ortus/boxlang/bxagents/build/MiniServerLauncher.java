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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

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
public class MiniServerLauncher extends BaseLauncher {

	/**
	 * Searches {@code PATH} for a `boxlang-miniserver` executable.
	 *
	 * @return The absolute path to the executable, or {@code null} if not found on PATH
	 */
	public static String findExecutable() {
		return findExecutable( System.getenv( "PATH" ) );
	}

	/**
	 * Searches the given folders for a `boxlang-miniserver` executable. The folders are a parameter so that a test can say where to look:
	 * a machine that has the binary on its real PATH, such as a CI runner, would otherwise change the answer.
	 *
	 * @param pathEnv The folders to search, joined the way the platform joins PATH
	 *
	 * @return The absolute path to the executable, or {@code null} if not found
	 */
	public static String findExecutable( String pathEnv ) {
		return findExecutableOnPath( pathEnv, "boxlang-miniserver" );
	}

	/**
	 * Starts `boxlang-miniserver` pointed at the given config file. If
	 * {@code executablePath} ends in {@code .jar}, it's launched as
	 * {@code java -jar <jar> <configPath>} instead of executed directly - the
	 * same jar-distribution form BoxLang core itself ships in (see
	 * {@code downloadBoxLang} in build.gradle),
	 * used by this module's own integration tests since no native
	 * `boxlang-miniserver` binary is installed in CI/sandboxes.
	 *
	 * @param executablePath Absolute path to the `boxlang-miniserver` executable or jar (see {@link #findExecutable()})
	 * @param configPath     Absolute path to a `miniserver.json` config file
	 * @param inheritIO      When true, the child process shares this process's stdin/stdout/stderr (so server logs are visible directly)
	 *
	 * @return The started {@link Process}
	 */
	public static Process launch( String executablePath, String configPath, boolean inheritIO ) {
		return launch( executablePath, configPath, inheritIO, Map.of() );
	}

	/**
	 * Same as {@link #launch(String, String, boolean)}, with extra environment variables for the child
	 * (on top of the ones this process has). `serve` uses it to tell the app where the shared chat
	 * database lives.
	 *
	 * @param executablePath Absolute path to the `boxlang-miniserver` executable or jar
	 * @param configPath     Absolute path to a `miniserver.json` config file
	 * @param inheritIO      When true, the child process shares this process's stdin/stdout/stderr
	 * @param environment    Variables to add to the child's environment; may be empty
	 *
	 * @return The started {@link Process}
	 */
	public static Process launch( String executablePath, String configPath, boolean inheritIO, Map<String, String> environment ) {
		return launch( executablePath, configPath, inheritIO, environment, null );
	}

	/**
	 * Same as {@link #launch(String, String, boolean, Map)}, started in a given working directory. A built app's
	 * {@code miniserver.json} names everything by paths relative to {@code .build} (its web root, engine config and
	 * home), and the engine's {@code ${user-dir}} is the working directory, so the app only finds its own folders
	 * when the server is started in {@code .build}.
	 *
	 * @param executablePath   Absolute path to the `boxlang-miniserver` executable or jar
	 * @param configPath       Path to a `miniserver.json` config file
	 * @param inheritIO        When true, the child process shares this process's stdin/stdout/stderr
	 * @param environment      Variables to add to the child's environment; may be empty
	 * @param workingDirectory The folder to start the server in; {@code null} keeps this process's own
	 *
	 * @return The started {@link Process}
	 */
	public static Process launch( String executablePath, String configPath, boolean inheritIO, Map<String, String> environment, String workingDirectory ) {
		List<String> command = new ArrayList<>();
		if ( executablePath.endsWith( ".jar" ) ) {
			command.add( System.getProperty( "java.home" ) + File.separator + "bin" + File.separator + "java" );
			command.add( "-jar" );
		}
		command.add( executablePath );
		command.add( configPath );

		return startProcess(
		    command,
		    environment,
		    workingDirectory,
		    inheritIO ? ProcessIO.INHERIT : ProcessIO.PIPE,
		    "Failed to launch boxlang-miniserver at [" + executablePath + "] with config [" + configPath + "]"
		);
	}

}
