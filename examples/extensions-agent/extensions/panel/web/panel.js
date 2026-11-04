// Runs in the page after it loads. `bxagents` is the small object the page gives scripts:
//   bxagents.slot( place )         a box of your own in header, sidebar or composer
//   bxagents.runCommand( "/ping" ) run a slash command, as if it were typed
//   bxagents.onRefresh( fn )       called after each change to the conversation, once the slots are drawn
( function () {
	var button = document.createElement( "button" );
	button.type = "button";
	button.className = "panel-button";
	button.textContent = "Ping";
	button.title = "Run /ping";
	button.addEventListener( "click", function () { bxagents.runCommand( "/ping" ); } );
	bxagents.slot( "composer" ).appendChild( button );
} )();
