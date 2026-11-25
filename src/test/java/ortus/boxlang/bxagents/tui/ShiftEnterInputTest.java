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

import org.junit.jupiter.api.Test;

import dev.tamboui.layout.Position;
import dev.tamboui.layout.Size;
import dev.tamboui.terminal.AbstractBackend;
import dev.tamboui.tui.event.EventParser;
import dev.tamboui.tui.event.KeyCode;
import dev.tamboui.tui.event.KeyEvent;
import ortus.boxlang.bxagents.tui.KeyMap.Action;

class ShiftEnterInputTest {

	@Test
	void kittyKeyboardProtocolShiftEnterAddsANewLineInsteadOfSubmitting() throws Exception {
		KeyEvent key = ( KeyEvent ) EventParser.readEvent( new InputBackend( "\u001b[13;2u" ), 10 );

		assertThat( key.isKey( KeyCode.ENTER ) ).isTrue();
		assertThat( KeyMap.defaults().is( Action.NEWLINE, key ) ).isTrue();
		assertThat( KeyMap.defaults().is( Action.SUBMIT, key ) ).isFalse();
	}

	private static final class InputBackend extends AbstractBackend {

		private final String	input;
		private int				cursor;

		private InputBackend( String input ) {
			this.input = input;
		}

		@Override
		public int read( int timeoutMs ) {
			return cursor < input.length() ? input.charAt( cursor++ ) : -2;
		}

		@Override
		public int peek( int timeoutMs ) {
			return cursor < input.length() ? input.charAt( cursor ) : -2;
		}

		@Override
		public void flush() {
		}

		@Override
		public void clear() {
		}

		@Override
		public Size size() {
			return new Size( 80, 24 );
		}

		@Override
		public void showCursor() {
		}

		@Override
		public void hideCursor() {
		}

		@Override
		public Position getCursorPosition() {
			return Position.ORIGIN;
		}

		@Override
		public void enterAlternateScreen() {
		}

		@Override
		public void leaveAlternateScreen() {
		}

		@Override
		public void enableRawMode() {
		}

		@Override
		public void disableRawMode() {
		}

		@Override
		public void onResize( Runnable handler ) {
		}

		@Override
		public void close() {
		}
	}
}
