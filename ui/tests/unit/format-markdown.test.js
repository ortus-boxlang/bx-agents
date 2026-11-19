// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { bytesText, countLabel, stampText, dayText } from "../../resources/assets/js/utils/format.js";
import { renderMarkdown } from "../../resources/assets/js/utils/markdown.js";

describe( "format", () => {
	it( "says sizes, counts and dates the same way everywhere", () => {
		expect( bytesText( 512 ) ).toBe( "512 B" );
		expect( bytesText( 3500 ) ).toBe( "3.4 KB" );
		expect( bytesText( 52428800 ) ).toBe( "50 MB" );
		expect( countLabel( 0, "tool" ) ).toBe( "no tools" );
		expect( countLabel( 1, "tool" ) ).toBe( "1 tool" );
		expect( countLabel( 2, "entry", "entries" ) ).toBe( "2 entries" );
		expect( stampText( "2026-11-18T09:30:12" ) ).toBe( "2026-11-18 09:30" );
		expect( dayText( "2026-11-18T09:30:12" ) ).toBe( "2026-11-18" );
	} );
} );

describe( "markdown", () => {
	it( "draws Markdown and removes anything that could run", () => {
		const html = renderMarkdown( "**b** <img src=x onerror=\"alert(1)\"> <script>alert(2)</script> [x](javascript:alert(3))" );
		expect( html ).toContain( "<strong>b</strong>" );
		// the model's HTML is shown as text: no element, no handler that could run
		const box = document.createElement( "div" );
		box.innerHTML = html;
		expect( box.querySelector( "img, script" ) ).toBeNull();
		expect( [ ...box.querySelectorAll( "*" ) ].some( el => [ ...el.attributes ].some( a => a.name.startsWith( "on" ) ) ) ).toBe( false );
		expect( html ).not.toContain( "<script" );
		expect( html ).not.toContain( "javascript:" );
	} );
} );
