package ortus.boxlang.bxagents.build;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

public class BxaPackagerTest {

	private void writeFile( Path root, String relativePath, String content ) throws IOException {
		Path target = root.resolve( relativePath );
		Files.createDirectories( target.getParent() );
		Files.writeString( target, content, StandardCharsets.UTF_8 );
	}

	private List<String> zipEntryNames( Path zipPath ) throws IOException {
		List<String> names = new ArrayList<>();
		try ( ZipFile zipFile = new ZipFile( zipPath.toFile() ) ) {
			Enumeration<? extends ZipEntry> entries = zipFile.entries();
			while ( entries.hasMoreElements() ) {
				names.add( entries.nextElement().getName() );
			}
		}
		return names;
	}

	@DisplayName( "It produces byte-identical zip output across two packagings of the same input" )
	@Test
	public void testDeterministicOutput( @TempDir Path appDir, @TempDir Path distDir1, @TempDir Path distDir2 ) throws IOException {
		writeFile( appDir, "Application.bx", "class { this.name = \"test\" }" );
		writeFile( appDir, "config/ColdBox.bx", "class { function configure(){} }" );
		writeFile( appDir, "agent/GeneratedAgentFactory.bx", "class { function buildAgent(){} }" );

		Path first	= BxaPackager.pack( appDir.toString(), distDir1.toString(), "test-agent-1.0.0", List.of() );
		Path second	= BxaPackager.pack( appDir.toString(), distDir2.toString(), "test-agent-1.0.0", List.of() );

		assertArrayEquals( Files.readAllBytes( first ), Files.readAllBytes( second ) );
	}

	@DisplayName( "It writes a .sha256 file matching an independently computed digest" )
	@Test
	public void testChecksum( @TempDir Path appDir, @TempDir Path distDir ) throws IOException, java.security.NoSuchAlgorithmException {
		writeFile( appDir, "Application.bx", "class { this.name = \"test\" }" );

		Path bxaPath = BxaPackager.pack( appDir.toString(), distDir.toString(), "test-agent-1.0.0", List.of() );
		byte[] bxaBytes = Files.readAllBytes( bxaPath );

		MessageDigest digest = MessageDigest.getInstance( "SHA-256" );
		byte[] expected = digest.digest( bxaBytes );
		StringBuilder expectedHex = new StringBuilder();
		for ( byte b : expected ) {
			expectedHex.append( String.format( "%02x", b ) );
		}

		Path shaPath = distDir.resolve( "test-agent-1.0.0.bxa.sha256" );
		assertTrue( Files.exists( shaPath ) );
		String shaContent = Files.readString( shaPath );
		assertTrue( shaContent.startsWith( expectedHex.toString() ), "sha256 file should start with the computed digest" );
	}

	@DisplayName( "It never includes a planted .env file, even without a .bxaignore entry" )
	@Test
	public void testExcludesDotEnv( @TempDir Path appDir, @TempDir Path distDir ) throws IOException {
		writeFile( appDir, "Application.bx", "class { this.name = \"test\" }" );
		writeFile( appDir, ".env", "OPENAI_API_KEY=super-secret-value" );
		writeFile( appDir, "tools/.env", "NESTED_SECRET=also-secret" );

		Path bxaPath = BxaPackager.pack( appDir.toString(), distDir.toString(), "test-agent-1.0.0", List.of() );

		List<String> names = zipEntryNames( bxaPath );
		assertFalse( names.contains( ".env" ) );
		assertFalse( names.contains( "tools/.env" ) );

		byte[] zipBytes = Files.readAllBytes( bxaPath );
		String zipContent = new String( zipBytes, StandardCharsets.ISO_8859_1 );
		assertFalse( zipContent.contains( "super-secret-value" ) );
	}

	@DisplayName( "It respects .bxaignore-style glob patterns" )
	@Test
	public void testRespectsIgnorePatterns( @TempDir Path appDir, @TempDir Path distDir ) throws IOException {
		writeFile( appDir, "Application.bx", "class { this.name = \"test\" }" );
		writeFile( appDir, "README.md", "docs, not shipped" );
		writeFile( appDir, "notes/todo.txt", "internal notes" );

		Path bxaPath = BxaPackager.pack( appDir.toString(), distDir.toString(), "test-agent-1.0.0", List.of( "*.md", "notes/*" ) );

		List<String> names = zipEntryNames( bxaPath );
		assertTrue( names.contains( "Application.bx" ) );
		assertFalse( names.contains( "README.md" ) );
		assertFalse( names.contains( "notes/todo.txt" ) );
	}

}
