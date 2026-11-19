import { describe, it, expect } from "vitest";
import { nextTab } from "../../resources/assets/js/utils/tabs.js";

describe( "tab keys", () => {
	it( "moves along the row and round its ends", () => {
		expect( nextTab( "ArrowRight", 0, 3 ) ).toBe( 1 );
		expect( nextTab( "ArrowRight", 2, 3 ) ).toBe( 0 );
		expect( nextTab( "ArrowLeft", 0, 3 ) ).toBe( 2 );
		expect( nextTab( "Home", 2, 3 ) ).toBe( 0 );
		expect( nextTab( "End", 0, 3 ) ).toBe( 2 );
	} );

	it( "leaves other keys to the page", () => {
		expect( nextTab( "Enter", 0, 3 ) ).toBe( -1 );
		expect( nextTab( "ArrowRight", 0, 0 ) ).toBe( -1 );
	} );
} );
