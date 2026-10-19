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

import java.util.List;
import java.util.stream.Collectors;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import dev.tamboui.text.Line;
import dev.tamboui.tui.event.KeyCode;
import dev.tamboui.tui.event.KeyEvent;
import dev.tamboui.tui.event.KeyModifiers;

/**
 * The parts of the chat screen that need no terminal: the message box, word wrapping and
 * Markdown to lines.
 */
@DisplayName( "Chat screen pieces" )
class ChatPiecesTest {

	private static void type( Composer c, String text ) {
		for ( char ch : text.toCharArray() ) {
			c.key( KeyEvent.ofChar( ch ) );
		}
	}

	private static Composer.Outcome enter( Composer c ) {
		return c.key( KeyEvent.ofKey( KeyCode.ENTER ) );
	}

	@Test
	@DisplayName( "Composer: Enter sends, an empty box sends nothing" )
	void composerSends() {
		Composer c = new Composer();
		assertThat( enter( c ) ).isEqualTo( Composer.Outcome.NONE );
		type( c, "hello" );
		assertThat( enter( c ) ).isEqualTo( Composer.Outcome.SUBMIT );
		assertThat( c.text() ).isEqualTo( "hello" );
		c.sent();
		assertThat( c.isEmpty() ).isTrue();
	}

	@Test
	@DisplayName( "Composer: Alt+Enter, Ctrl+J and a trailing backslash add a line" )
	void composerNewLines() {
		Composer c = new Composer();
		type( c, "one" );
		c.key( KeyEvent.ofKey( KeyCode.ENTER, KeyModifiers.ALT ) );
		type( c, "two" );
		c.key( KeyEvent.ofChar( 'j', KeyModifiers.CTRL ) );
		type( c, "three\\" );
		assertThat( enter( c ) ).isEqualTo( Composer.Outcome.NONE );
		type( c, "four" );

		assertThat( c.text() ).isEqualTo( "one\ntwo\nthree\nfour" );
		assertThat( c.rowCount() ).isEqualTo( 4 );
	}

	@Test
	@DisplayName( "Composer: editing in the middle of a line and across lines" )
	void composerEditing() {
		Composer c = new Composer();
		type( c, "helo" );
		c.key( KeyEvent.ofKey( KeyCode.LEFT ) );
		type( c, "l" );
		assertThat( c.text() ).isEqualTo( "hello" );

		c.key( KeyEvent.ofKey( KeyCode.HOME ) );
		c.key( KeyEvent.ofKey( KeyCode.DELETE ) );
		assertThat( c.text() ).isEqualTo( "ello" );

		c.setText( "ab\ncd" );
		c.key( KeyEvent.ofKey( KeyCode.HOME ) );
		c.key( KeyEvent.ofKey( KeyCode.BACKSPACE ) );
		assertThat( c.text() ).isEqualTo( "abcd" );
		assertThat( c.caretCol() ).isEqualTo( 2 );
	}

	@Test
	@DisplayName( "Composer: Ctrl+U clears to the start, Ctrl+W deletes a word" )
	void composerKills() {
		Composer c = new Composer();
		type( c, "keep this" );
		c.key( KeyEvent.ofChar( 'w', KeyModifiers.CTRL ) );
		assertThat( c.text() ).isEqualTo( "keep " );
		c.key( KeyEvent.ofChar( 'u', KeyModifiers.CTRL ) );
		assertThat( c.text() ).isEmpty();
	}

	@Test
	@DisplayName( "Composer: Up and Down walk the history and restore the draft" )
	void composerHistory() {
		Composer c = new Composer();
		type( c, "first" );
		c.sent();
		type( c, "second" );
		c.sent();
		type( c, "draft" );

		c.key( KeyEvent.ofKey( KeyCode.UP ) );
		assertThat( c.text() ).isEqualTo( "second" );
		c.key( KeyEvent.ofKey( KeyCode.UP ) );
		assertThat( c.text() ).isEqualTo( "first" );
		c.key( KeyEvent.ofKey( KeyCode.UP ) );
		assertThat( c.text() ).isEqualTo( "first" );
		c.key( KeyEvent.ofKey( KeyCode.DOWN ) );
		c.key( KeyEvent.ofKey( KeyCode.DOWN ) );
		assertThat( c.text() ).isEqualTo( "draft" );
	}

	@Test
	@DisplayName( "Composer: Ctrl+C clears typed text, then asks to leave; Ctrl+D leaves from an empty box" )
	void composerLeaves() {
		Composer c = new Composer();
		type( c, "oops" );
		assertThat( c.key( KeyEvent.ofChar( 'c', KeyModifiers.CTRL ) ) ).isEqualTo( Composer.Outcome.CLEARED );
		assertThat( c.isEmpty() ).isTrue();
		assertThat( c.key( KeyEvent.ofChar( 'c', KeyModifiers.CTRL ) ) ).isEqualTo( Composer.Outcome.EXIT );
		assertThat( c.key( KeyEvent.ofChar( 'd', KeyModifiers.CTRL ) ) ).isEqualTo( Composer.Outcome.EXIT );

		type( c, "ab" );
		c.key( KeyEvent.ofKey( KeyCode.HOME ) );
		assertThat( c.key( KeyEvent.ofChar( 'd', KeyModifiers.CTRL ) ) ).isEqualTo( Composer.Outcome.NONE );
		assertThat( c.text() ).isEqualTo( "b" );
	}

	@Test
	@DisplayName( "Composer: a paste keeps its lines" )
	void composerPaste() {
		Composer c = new Composer();
		c.paste( "one\r\ntwo\nthree" );

		assertThat( c.text() ).isEqualTo( "one\ntwo\nthree" );
		assertThat( c.caretRow() ).isEqualTo( 2 );
	}

	@Test
	@DisplayName( "Wrap: breaks at spaces, keeps blank lines, splits an overlong word, and tails" )
	void wrap() {
		assertThat( Wrap.wrap( "aaa bbb ccc ddd", 8 ) ).containsExactly( "aaa bbb", "ccc ddd" ).inOrder();
		assertThat( Wrap.wrap( "one\n\ntwo", 20 ) ).containsExactly( "one", "", "two" ).inOrder();
		assertThat( Wrap.wrap( "abcdefghijkl", 8 ) ).containsExactly( "abcdefgh", "ijkl" ).inOrder();
		assertThat( Wrap.tail( "1\n2\n3\n4\n5", 20, 2 ) ).containsExactly( "4", "5" ).inOrder();
	}

	@Test
	@DisplayName( "MarkdownLines: headings, lists and code come out as lines of the right text" )
	void markdown() {
		List<Line>	lines	= MarkdownLines.render( "# Title\n\nSome **bold** text.\n\n- one\n- two\n\n```java\nint x = 1;\n```\n", 60 );
		String		text	= lines.stream().map( Line::rawContent ).collect( Collectors.joining( "\n" ) );

		assertThat( text ).contains( "Title" );
		assertThat( text ).contains( "Some bold text." );
		assertThat( text ).contains( "one" );
		assertThat( text ).contains( "int x = 1;" );
		assertThat( text ).doesNotContain( "**" );
		assertThat( lines.get( lines.size() - 1 ).rawContent().isBlank() ).isFalse();
	}

	@Test
	@DisplayName( "MarkdownLines: nothing in, nothing out" )
	void markdownEmpty() {
		assertThat( MarkdownLines.render( "", 40 ) ).isEmpty();
	}

}
