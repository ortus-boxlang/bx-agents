import { describe, it, expect } from "vitest";
import { needsAttention, routineSummary, routineLine } from "../../resources/assets/js/components/routines/RoutinesPage.js";

describe( "routine helpers", () => {
	it( "knows which routines need attention", () => {
		expect( needsAttention( { statusText: "failed last time" } ) ).toBe( true );
		expect( needsAttention( { statusText: "paused after failures" } ) ).toBe( true );
		expect( needsAttention( { statusText: "paused" } ) ).toBe( false );
	} );

	it( "counts the routines for the summary", () => {
		const rows = [
			{ statusText: "ok", enabled: true },
			{ statusText: "failed last time", enabled: true },
			{ statusText: "paused", enabled: false }
		];
		expect( routineSummary( rows ).map( c => c.text ) ).toEqual( [
			"3 routines",
			"1 ok",
			"0 waiting for approval",
			"1 needs attention",
			"1 paused"
		] );
	} );

	it( "says what comes next and where answers go", () => {
		expect( routineLine( { destination: "routine" } ) ).toBe( "Next run: none. Last run: never. Answers go to its own conversation." );
		expect( routineLine( { destination: "gateway:slack", destinationChat: "C1", nextRunText: "in 2h", lastRunText: "today", lastStatus: "ok" } ) )
			.toBe( "Next run: in 2h. Last run: today, ok. Answers go to gateway:slack (chat C1)." );
	} );
} );
