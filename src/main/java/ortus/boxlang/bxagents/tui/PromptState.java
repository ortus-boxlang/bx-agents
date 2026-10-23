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

import java.util.List;

/**
 * Everything a {@link PromptStyle} needs to draw the prompt, worked out by the screen: plain data, so a style
 * never touches the composer, the clock or the terminal, and a test can build one by hand.
 *
 * @param lines     the visible rows of the message box
 * @param caretRow  the row, in {@code lines}, the caret is on
 * @param caretCol  the column the caret is at
 * @param working   true while the agent runs a turn
 * @param label     the word in the top bar: "you" at rest, "working 12s" during a turn
 * @param top       the widgets for the top bar, already worked out and never blank
 * @param bottom    the widgets for the bottom bar or hint row, likewise
 * @param hint      the keys line, such as "enter send · alt+enter new line · ? keys"
 * @param recording true while the screen is being recorded
 * @param width     the columns a row may use
 */
public record PromptState( List<String> lines, int caretRow, int caretCol, boolean working, String label, List<String> top, List<String> bottom,
    String hint, boolean recording, int width ) {
}
