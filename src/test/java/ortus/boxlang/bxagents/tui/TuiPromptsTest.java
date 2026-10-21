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
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import dev.tamboui.tui.event.KeyCode;
import dev.tamboui.tui.event.KeyEvent;
import dev.tamboui.tui.event.KeyModifiers;

/**
 * The prompts without a terminal: keys in, rows and an answer out.
 */
@DisplayName( "Terminal prompts" )
class TuiPromptsTest {

	private static final Theme PLAIN = Theme.detect( "1", "xterm", null );

	private static List<Choice> choices( String... values ) {
		return Choice.listFrom( List.of( values ) );
	}

	private static String screen( Prompt p ) {
		return p.render( 80, 20 ).stream().map( Row::plainText ).collect( Collectors.joining( "\n" ) );
	}

	private static KeyEvent ctrlC() {
		return KeyEvent.ofChar( 'c', KeyModifiers.CTRL );
	}

	@Test
	@DisplayName( "Theme: NO_COLOR and a dumb terminal turn color off, COLORTERM selects true color" )
	void theme() {
		assertThat( Theme.detect( "1", "xterm-256color", "truecolor" ).depth() ).isEqualTo( "none" );
		assertThat( Theme.detect( null, "dumb", null ).depth() ).isEqualTo( "none" );
		assertThat( Theme.detect( null, "xterm-256color", "truecolor" ).depth() ).isEqualTo( "truecolor" );
		assertThat( Theme.detect( null, "xterm-256color", null ).depth() ).isEqualTo( "indexed" );
		assertThat( Theme.detect( null, "xterm", null ).depth() ).isEqualTo( "basic" );
	}

	@Test
	@DisplayName( "Theme: paint adds the palette's escape codes only when color is on" )
	void paint() {
		assertThat( PLAIN.paint( "accent", "hi" ) ).isEqualTo( "hi" );
		assertThat( Theme.detect( null, "xterm", "24bit" ).paint( "accent", "hi" ) ).isEqualTo( "\u001b[38;2;0;219;255mhi\u001b[0m" );
		assertThat( Theme.detect( null, "xterm-256color", null ).paint( "ok", "hi" ) ).startsWith( "\u001b[38;5;48m" );
		assertThat( Theme.detect( null, "xterm", "truecolor" ).paint( "bold", "hi" ) ).startsWith( "\u001b[1m" );
	}

	@Test
	@DisplayName( "Choice reads strings and structs, whatever the key case" )
	void choice() {
		Choice	a	= Choice.from( "plain" );
		Choice	b	= Choice.from( Map.of( "VALUE", "x", "label", "The X", "hint", "h", "selected", "true" ) );

		assertThat( a.value ).isEqualTo( "plain" );
		assertThat( a.label ).isEqualTo( "plain" );
		assertThat( b.value ).isEqualTo( "x" );
		assertThat( b.label ).isEqualTo( "The X" );
		assertThat( b.hint ).isEqualTo( "h" );
		assertThat( b.selected ).isTrue();
	}

	@Test
	@DisplayName( "Select: down and enter pick the second option, and it wraps" )
	void select() {
		SelectPrompt p = new SelectPrompt( PLAIN, "Pick", "", choices( "a", "b", "c" ), "a" );
		p.key( KeyEvent.ofKey( KeyCode.DOWN ) );
		p.key( KeyEvent.ofKey( KeyCode.ENTER ) );
		assertThat( p.result() ).isEqualTo( "b" );

		SelectPrompt wrap = new SelectPrompt( PLAIN, "Pick", "", choices( "a", "b", "c" ), "a" );
		wrap.key( KeyEvent.ofKey( KeyCode.UP ) );
		wrap.key( KeyEvent.ofKey( KeyCode.ENTER ) );
		assertThat( wrap.result() ).isEqualTo( "c" );
	}

	@Test
	@DisplayName( "Select: starts on the current value and marks the cursor row" )
	void selectRenders() {
		SelectPrompt	p		= new SelectPrompt( PLAIN, "Which?", "Help text",
		    Choice.listFrom( List.of( Map.of( "value", "a", "label", "Alpha", "hint", "first" ), "b" ) ), "b" );
		String			text	= screen( p );

		assertThat( text ).contains( "? Which?" );
		assertThat( text ).contains( "Help text" );
		assertThat( text ).contains( "Alpha  first" );
		assertThat( text ).contains( "> b" );
		assertThat( text ).doesNotContain( "> Alpha" );
	}

	@Test
	@DisplayName( "Select: a long list scrolls and says there is more" )
	void selectScrolls() {
		String[] many = new String[ 30 ];
		for ( int i = 0; i < many.length; i++ ) {
			many[ i ] = "item" + i;
		}
		SelectPrompt	p		= new SelectPrompt( PLAIN, "Long", "", choices( many ), "item0" );
		String			shown	= p.render( 80, 8 ).stream().map( Row::plainText ).collect( Collectors.joining( "\n" ) );

		assertThat( shown ).contains( "item0" );
		assertThat( shown ).doesNotContain( "item29" );
		assertThat( shown ).contains( "more" );
	}

	@Test
	@DisplayName( "Select: Esc goes back, Ctrl+C cancels" )
	void selectAborts() {
		SelectPrompt	p		= new SelectPrompt( PLAIN, "Pick", "", choices( "a" ), "a" );
		PromptAbort		back	= assertThrows( PromptAbort.class, () -> p.key( KeyEvent.ofKey( KeyCode.ESCAPE ) ) );
		PromptAbort		cancel	= assertThrows( PromptAbort.class, () -> p.key( ctrlC() ) );

		assertThat( back.getMessage() ).isEqualTo( "wizard:back" );
		assertThat( back.isBack() ).isTrue();
		assertThat( cancel.getMessage() ).isEqualTo( "wizard:cancel" );
		assertThat( cancel.isBack() ).isFalse();
	}

	@Test
	@DisplayName( "Select: a review screen shows its lines above the choices" )
	void review() {
		SelectPrompt	p		= new SelectPrompt( PLAIN, "Ready?", "", choices( "create", "cancel" ), null, List.of( "Name  bot", "Model  claude" ) );
		String			text	= screen( p );

		assertThat( text.indexOf( "Name  bot" ) ).isLessThan( text.indexOf( "> create" ) );
	}

	@Test
	@DisplayName( "MultiSelect: space toggles, a toggles all, defaults start ticked" )
	@SuppressWarnings( "unchecked" )
	void multiSelect() {
		MultiSelectPrompt p = new MultiSelectPrompt( PLAIN, "Pick", "",
		    Choice.listFrom( List.of( Map.of( "value", "a", "selected", true ), "b", "c" ) ) );
		p.key( KeyEvent.ofKey( KeyCode.DOWN ) );
		p.key( KeyEvent.ofChar( ' ' ) );
		p.key( KeyEvent.ofKey( KeyCode.ENTER ) );
		assertThat( ( List<String> ) p.result() ).containsExactly( "a", "b" ).inOrder();

		MultiSelectPrompt all = new MultiSelectPrompt( PLAIN, "Pick", "", choices( "a", "b" ) );
		all.key( KeyEvent.ofChar( 'a' ) );
		all.key( KeyEvent.ofKey( KeyCode.ENTER ) );
		assertThat( ( List<String> ) all.result() ).containsExactly( "a", "b" ).inOrder();

		MultiSelectPrompt none = new MultiSelectPrompt( PLAIN, "Pick", "", choices( "a" ) );
		none.key( KeyEvent.ofKey( KeyCode.ENTER ) );
		assertThat( ( List<String> ) none.result() ).isEmpty();
	}

	@Test
	@DisplayName( "MultiSelect: ticked options show [x]" )
	void multiSelectRenders() {
		MultiSelectPrompt	p		= new MultiSelectPrompt( PLAIN, "Pick", "", Choice.listFrom( List.of( Map.of( "value", "a", "selected", true ), "b" ) ) );
		String				text	= screen( p );

		assertThat( text ).contains( "[x] a" );
		assertThat( text ).contains( "[ ] b" );
	}

	@Test
	@DisplayName( "Text: typing, editing in the middle, and the default on an empty Enter" )
	void text() {
		TextPrompt p = new TextPrompt( PLAIN, "Name", "", "fallback", false, "" );
		p.key( KeyEvent.ofChar( 'a' ) );
		p.key( KeyEvent.ofChar( 'c' ) );
		p.key( KeyEvent.ofKey( KeyCode.LEFT ) );
		p.key( KeyEvent.ofChar( 'b' ) );
		p.key( KeyEvent.ofKey( KeyCode.ENTER ) );
		assertThat( p.result() ).isEqualTo( "abc" );

		TextPrompt d = new TextPrompt( PLAIN, "Name", "", "fallback", false, "" );
		d.key( KeyEvent.ofKey( KeyCode.ENTER ) );
		assertThat( d.result() ).isEqualTo( "fallback" );

		TextPrompt back = new TextPrompt( PLAIN, "Name", "", "", false, "" );
		back.key( KeyEvent.ofChar( 'x' ) );
		back.key( KeyEvent.ofChar( 'y' ) );
		back.key( KeyEvent.ofKey( KeyCode.BACKSPACE ) );
		back.key( KeyEvent.ofKey( KeyCode.ENTER ) );
		assertThat( back.result() ).isEqualTo( "x" );
	}

	@Test
	@DisplayName( "Text: Ctrl+U clears, paste goes in at the caret without newlines" )
	void textClearAndPaste() {
		TextPrompt p = new TextPrompt( PLAIN, "Name", "", "", false, "" );
		p.key( KeyEvent.ofChar( 'z' ) );
		p.key( KeyEvent.ofChar( 'u', KeyModifiers.CTRL ) );
		p.paste( "he\nllo\r" );
		p.key( KeyEvent.ofKey( KeyCode.ENTER ) );

		assertThat( p.result() ).isEqualTo( "hello" );
	}

	@Test
	@DisplayName( "Text: a required answer is asked again, with the message" )
	void textRequired() {
		TextPrompt p = new TextPrompt( PLAIN, "Name", "", "", false, "A name is required" );
		p.key( KeyEvent.ofKey( KeyCode.ENTER ) );

		assertThat( p.isDone() ).isFalse();
		assertThat( screen( p ) ).contains( "A name is required" );

		p.key( KeyEvent.ofChar( 'x' ) );
		p.key( KeyEvent.ofKey( KeyCode.ENTER ) );
		assertThat( p.result() ).isEqualTo( "x" );
	}

	@Test
	@DisplayName( "Text: a secret shows bullets, never the text" )
	void textSecret() {
		TextPrompt p = new TextPrompt( PLAIN, "Password", "", "", true, "" );
		for ( char c : "hunter2".toCharArray() ) {
			p.key( KeyEvent.ofChar( c ) );
		}

		assertThat( screen( p ) ).contains( "•••••••" );
		assertThat( screen( p ) ).doesNotContain( "hunter2" );
	}

	@Test
	@DisplayName( "Confirm: y, n, and Enter on the highlighted answer" )
	void confirm() {
		ConfirmPrompt yes = new ConfirmPrompt( PLAIN, "Sure?", "", false );
		yes.key( KeyEvent.ofChar( 'y' ) );
		assertThat( yes.result() ).isEqualTo( Boolean.TRUE );

		ConfirmPrompt no = new ConfirmPrompt( PLAIN, "Sure?", "", true );
		no.key( KeyEvent.ofChar( 'n' ) );
		assertThat( no.result() ).isEqualTo( Boolean.FALSE );

		ConfirmPrompt toggled = new ConfirmPrompt( PLAIN, "Sure?", "", true );
		toggled.key( KeyEvent.ofKey( KeyCode.RIGHT ) );
		toggled.key( KeyEvent.ofKey( KeyCode.ENTER ) );
		assertThat( toggled.result() ).isEqualTo( Boolean.FALSE );
	}

	@Test
	@DisplayName( "Row: text that does not fit ends in an ellipsis" )
	void rowClips() {
		dev.tamboui.buffer.Buffer buf = dev.tamboui.buffer.Buffer.empty( new dev.tamboui.layout.Rect( 0, 0, 10, 1 ) );
		Row.of( "0123456789abcdef", PLAIN.plain ).draw( buf, 0, 0, 10 );

		StringBuilder line = new StringBuilder();
		for ( int x = 0; x < 10; x++ ) {
			line.append( buf.get( x, 0 ).symbol() );
		}
		assertThat( line.toString() ).isEqualTo( "012345678…" );
	}

	@Test
	@DisplayName( "SelectPrompt: a hotkey finishes with the letter and the row under the cursor, Tab too, Enter still just picks" )
	void hotkeys() {
		SelectPrompt p = new SelectPrompt( PLAIN, "Notes", "", choices( "n1", "n2", "n3" ), null ).withHotkeys( "aed", "a add" );
		p.key( KeyEvent.ofKey( KeyCode.DOWN ) );
		p.key( KeyEvent.ofChar( 'e', KeyModifiers.NONE ) );
		assertThat( p.result() ).isEqualTo( "e:n2" );
		assertThat( p.footer() ).isEqualTo( "a add" );

		SelectPrompt tab = new SelectPrompt( PLAIN, "Notes", "", choices( "n1" ), null ).withHotkeys( "a", "" );
		tab.key( KeyEvent.ofKey( KeyCode.TAB ) );
		assertThat( tab.result() ).isEqualTo( "tab:n1" );

		SelectPrompt enter = new SelectPrompt( PLAIN, "Notes", "", choices( "n1", "n2" ), null ).withHotkeys( "a", "" );
		enter.key( KeyEvent.ofKey( KeyCode.ENTER ) );
		assertThat( enter.result() ).isEqualTo( "n1" );

		SelectPrompt other = new SelectPrompt( PLAIN, "Notes", "", choices( "n1" ), null ).withHotkeys( "a", "" );
		other.key( KeyEvent.ofChar( 'x', KeyModifiers.NONE ) );
		assertThat( other.isDone() ).isFalse();
	}

	@Test
	@DisplayName( "SelectPrompt: a hotkey works on an empty list, with an empty value" )
	void hotkeyOnEmptyList() {
		SelectPrompt p = new SelectPrompt( PLAIN, "Notes", "", List.of(), null ).withHotkeys( "a", "" );
		p.key( KeyEvent.ofChar( 'a', KeyModifiers.NONE ) );
		assertThat( p.result() ).isEqualTo( "a:" );
	}

	@Test
	@DisplayName( "TextPrompt: starts with the text to edit and the caret at its end" )
	void textInitial() {
		TextPrompt p = new TextPrompt( PLAIN, "Edit", "", "", false, "required", "likes tea" );
		p.key( KeyEvent.ofKey( KeyCode.BACKSPACE ) );
		p.key( KeyEvent.ofChar( 'x', KeyModifiers.NONE ) );
		p.key( KeyEvent.ofKey( KeyCode.ENTER ) );
		assertThat( p.result() ).isEqualTo( "likes tex" );
	}

}
