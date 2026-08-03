package ortus.boxlang.bxagents;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.io.IOException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.FileVisitResult;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.List;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;

/**
 * A real OS-process-level CLI smoke test: spawns genuine `java -jar
 * <boxlang-jar> --bx-config <config> module:bxagents <verb> ...` child
 * processes against a copy of the ACTUAL installable module structure
 * (build/modules/bxagents, produced by the `createModuleStructure` Gradle
 * task), pointed at a real modulesDirectory - exactly how a real user's
 * BoxLang installation discovers and loads this module. Every other CLI
 * spec (tests/specs/cli/*.bx, tests/specs/ModuleConfigCliSpec.bx) calls
 * ModuleConfig.main()/each verb's run() in-process instead, which is faster
 * but never proves the module resolves correctly once genuinely installed.
 * <p>
 * This exact gap caught a real bug this session: {@code ModuleConfig.bx}'s
 * verb dispatch table and several internal classes referenced sibling
 * classes with a bare {@code bxagents.models....} dotted path, which only
 * resolved thanks to this repo's OWN dev/test {@code boxlang.json} (a
 * hand-declared {@code /bxagents} mapping) - a genuinely installed module
 * never gets that mapping (only BoxLang's own auto-registered
 * {@code bxModules.bxagents}/{@code @bxagents} resolution), so every CLI
 * verb failed with "class not located" the moment this was tested through a
 * real process instead of an in-process call. Fixed by switching internal
 * cross-references to the {@code Class@bxagents} suffix form (module root
 * ModuleConfig.bx itself resolves bare relative paths just fine - only
 * nested classes needed the fix) - see BuildPipeline.bx's init() docblock.
 * <p>
 * Runs `new` -> `build` -> `clean` in order (each its own real process,
 * chained against the same temp project directory) via {@code @Order} since
 * `build`/`clean` depend on `new`'s output existing on disk.
 */
@TestMethodOrder( MethodOrderer.OrderAnnotation.class )
public class ModuleCliProcessTest {

	private static Path	boxlangJar;
	private static Path	moduleSourceDir;
	private static Path	tempRoot;
	private static Path	modulesDir;
	private static Path	configPath;
	private static Path	projectDir;

	@BeforeAll
	public static void findPrerequisites() throws IOException {
		boxlangJar		= findJar( Path.of( "src/test/resources/libs" ), "boxlang-*.jar", "boxlang-miniserver" );
		moduleSourceDir	= Path.of( "build/modules/bxagents" );
	}

	private static Path findJar( Path dir, String glob, String excludeContains ) throws IOException {
		if ( !Files.isDirectory( dir ) ) {
			return null;
		}
		try ( DirectoryStream<Path> stream = Files.newDirectoryStream( dir, glob ) ) {
			for ( Path candidate : stream ) {
				if ( excludeContains == null || !candidate.getFileName().toString().contains( excludeContains ) ) {
					return candidate;
				}
			}
		}
		return null;
	}

	private void ensureTempModuleInstall() throws IOException {
		if ( tempRoot != null ) {
			return;
		}
		assumeTrue( boxlangJar != null, "BoxLang jar not found - run `./gradlew downloadBoxLang` first" );
		assumeTrue( Files.isDirectory( moduleSourceDir ),
		    "build/modules/bxagents not found - run `./gradlew shadowJar` first (it triggers createModuleStructure)" );

		tempRoot	= Files.createTempDirectory( "bxagents-cli-process-test-" );
		modulesDir	= tempRoot.resolve( "modules" );
		Files.createDirectories( modulesDir );
		copyRecursively( moduleSourceDir, modulesDir.resolve( "bxagents" ) );

		configPath = tempRoot.resolve( "boxlang.json" );
		Files.writeString( configPath, """
		                               {
		                                 "modulesDirectory": [ "%s" ]
		                               }
		                               """.formatted( modulesDir.toString().replace( "\\", "\\\\" ) ) );

		projectDir = tempRoot.resolve( "myagent" );
	}

	private static void copyRecursively( Path source, Path target ) throws IOException {
		Files.walkFileTree( source, new SimpleFileVisitor<Path>() {

			@Override
			public FileVisitResult preVisitDirectory( Path dir, BasicFileAttributes attrs ) throws IOException {
				Files.createDirectories( target.resolve( source.relativize( dir ) ) );
				return FileVisitResult.CONTINUE;
			}

			@Override
			public FileVisitResult visitFile( Path file, BasicFileAttributes attrs ) throws IOException {
				Files.copy( file, target.resolve( source.relativize( file ) ) );
				return FileVisitResult.CONTINUE;
			}
		} );
	}

	/**
	 * Runs a real `java -jar <boxlang-jar> --bx-config <config> module:bxagents <verb> ...`
	 * child process and waits (with a timeout) for it to exit.
	 */
	private int runVerb( String... verbArgs ) throws Exception {
		List<String> command = new java.util.ArrayList<>( List.of(
		    System.getProperty( "java.home" ) + java.io.File.separator + "bin" + java.io.File.separator + "java",
		    "-jar", boxlangJar.toAbsolutePath().toString(),
		    "--bx-config", configPath.toAbsolutePath().toString(),
		    "module:bxagents"
		) );
		command.addAll( List.of( verbArgs ) );

		Process	process		= new ProcessBuilder( command )
		    .redirectErrorStream( true )
		    .redirectOutput( ProcessBuilder.Redirect.INHERIT )
		    .start();

		boolean	finished	= process.waitFor( 60, TimeUnit.SECONDS );
		if ( !finished ) {
			process.destroyForcibly();
			throw new AssertionError( "module:bxagents " + String.join( " ", verbArgs ) + " never exited within 60s" );
		}
		return process.exitValue();
	}

	@Order( 1 )
	@DisplayName( "a real `module:bxagents new` OS process scaffolds a project" )
	@Test
	public void testNewProcess() throws Exception {
		ensureTempModuleInstall();

		int exitCode = runVerb( "new", projectDir.toString(), "--model=mock/mock-model" );

		assertEquals( 0, exitCode, "module:bxagents new should exit 0" );
		assertTrue( Files.exists( projectDir.resolve( "Agent.bx" ) ), "Agent.bx should have been scaffolded" );
		assertTrue( Files.exists( projectDir.resolve( "instructions.md" ) ), "instructions.md should have been scaffolded" );
	}

	@Order( 2 )
	@DisplayName( "a real `module:bxagents build` OS process assembles the generated app" )
	@Test
	public void testBuildProcess() throws Exception {
		ensureTempModuleInstall();
		assumeTrue( Files.exists( projectDir.resolve( "Agent.bx" ) ), "requires testNewProcess to have run first" );

		int exitCode = runVerb( "build", projectDir.toString() );

		assertEquals( 0, exitCode, "module:bxagents build should exit 0" );
		assertTrue( Files.exists( projectDir.resolve( ".build/app/Application.bx" ) ), "a real Application.bx should have been generated" );
		assertTrue( Files.exists( projectDir.resolve( ".build/manifest.json" ) ), "a real manifest.json should have been written" );
	}

	@Order( 3 )
	@DisplayName( "a real `module:bxagents clean` OS process removes .build without touching source" )
	@Test
	public void testCleanProcess() throws Exception {
		ensureTempModuleInstall();
		assumeTrue( Files.exists( projectDir.resolve( ".build/app/Application.bx" ) ), "requires testBuildProcess to have run first" );

		int exitCode = runVerb( "clean", projectDir.toString() );

		assertEquals( 0, exitCode, "module:bxagents clean should exit 0" );
		assertFalse( Files.exists( projectDir.resolve( ".build" ) ), ".build should have been removed" );
		assertTrue( Files.exists( projectDir.resolve( "Agent.bx" ) ), "source files must never be touched by clean" );
	}

}
