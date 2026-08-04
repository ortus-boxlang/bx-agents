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

import java.io.IOException;

/**
 * Launches a fresh BoxLang child process to run a project's own
 * {@code tests/specs} via TestBox, pointed at a purpose-built
 * {@code boxlang.json} - the {@code test} CLI verb's real implementation
 * (M15), via {@link ortus.boxlang.bxagents.build.TestRunnerLauncher}'s
 * BoxLang caller, {@code TestRunnerService.bx}.
 * <p>
 * A fresh child process (rather than registering a mapping mid-script in
 * the current process) is required here: confirmed empirically that a
 * mapping registered via {@code Configuration.registerMapping()} mid-script
 * does not reliably propagate to TestBox's own directory-mapping-based
 * bundle discovery within the same script execution - the same class of
 * limitation this project already documented for a different scenario (the
 * abandoned ColdBox {@code VirtualApp} mapping experiment). Mirrors
 * {@link MiniServerLauncher}'s "shell out to a fresh process" pattern rather
 * than fighting the runtime's own mapping caching.
 */
public class TestRunnerLauncher {

	/**
	 * Starts {@code java -Dbxagents.testing.projectRoot=<projectRoot> -jar <boxlangJarPath> --bx-config <configPath> <scriptPath>}
	 * as a child process, inheriting this process's stdout/stderr so test
	 * output streams live. The {@code -D} system property is how
	 * {@code BaseAgentSpec.bx} (running inside that child process) learns
	 * the real project root to build against - BoxLang's own
	 * {@code getSystemSetting()} BIF reads Java system properties, and a
	 * spec has no other reliable way to learn this (its own `expandPath("/")`
	 * resolves relative to the spawned process's registered "/" mapping, not
	 * to the target project - confirmed empirically this session).
	 *
	 * @param javaBin        Absolute path to the {@code java} executable (e.g. {@code System.getProperty("java.home") + "/bin/java"})
	 * @param boxlangJarPath Absolute path to the BoxLang runtime jar currently executing (see {@code TestRunnerService.bx} for how this is located)
	 * @param configPath     Absolute path to a purpose-built {@code boxlang.json} (mappings for the target project's {@code tests/specs}/{@code tests/testbox}, plus this runtime's own {@code modulesDirectory} so {@code BaseAgentSpec} resolves)
	 * @param scriptPath     Absolute path to the generated {@code .bxs} runner script
	 * @param projectRoot    Absolute path to the real project root under test (NOT the temp copy `BaseAgentSpec` itself builds against - it makes its own throwaway copy of this)
	 *
	 * @return The started {@link Process}
	 */
	public static Process launch( String javaBin, String boxlangJarPath, String configPath, String scriptPath, String projectRoot ) {
		try {
			ProcessBuilder builder = new ProcessBuilder(
			    javaBin,
			    "-Dbxagents.testing.projectRoot=" + projectRoot,
			    "-jar", boxlangJarPath,
			    "--bx-config", configPath,
			    scriptPath
			);
			builder.redirectErrorStream( true );
			builder.redirectOutput( ProcessBuilder.Redirect.INHERIT );
			return builder.start();
		} catch ( IOException e ) {
			throw new RuntimeException( "Failed to launch the test runner process", e );
		}
	}

}
