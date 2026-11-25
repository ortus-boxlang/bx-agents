/**
 * [BoxLang]
 *
 * Copyright [2023] [Ortus Solutions, Corp]
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may obtain a
 * copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
package ortus.boxlang.bxagents.tui;

import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Shows the chat's working spinner while its agent and TUI are being prepared.
 */
public final class StartupSpinner implements AutoCloseable {

	private final AtomicBoolean	running	= new AtomicBoolean( true );
	private final String		message;
	private final Thread		thread;

	/**
	 * Creates a new startup spinner with the given message.
	 *
	 * @param message the message to display alongside the spinner
	 */
	private StartupSpinner( String message ) {
		this.message	= message;
		this.thread		= new Thread( this::animate, "bxagents-chat-startup-spinner" );
		this.thread.setDaemon( true );
		this.thread.start();
	}

	/**
	 * Starts a new startup spinner with the given message.
	 *
	 * @param message the message to display alongside the spinner
	 *
	 * @return the created startup spinner
	 */
	public static StartupSpinner start( String message ) {
		return new StartupSpinner( message );
	}

	/**
	 * Animates the spinner until it is stopped.
	 */
	private void animate() {
		long	started	= System.nanoTime();
		int		frame	= 0;
		try {
			while ( running.get() ) {
				long seconds = ( System.nanoTime() - started ) / 1_000_000_000L;
				System.err.print( "\r" + ChatScreen.SPINNER[ frame++ % ChatScreen.SPINNER.length ] + " " + message + " " + seconds + "s" );
				System.err.flush();
				Thread.sleep( 80L );
			}
		} catch ( InterruptedException e ) {
			Thread.currentThread().interrupt();
		} finally {
			System.err.print( "\r\033[2K" );
			System.err.flush();
		}
	}

	/**
	 * Stops the spinner and waits for the animation thread to finish.
	 * 
	 * @see java.lang.AutoCloseable#close()
	 */
	@Override
	public void close() {
		if ( !running.getAndSet( false ) ) {
			return;
		}
		thread.interrupt();
		try {
			thread.join( 500L );
		} catch ( InterruptedException e ) {
			Thread.currentThread().interrupt();
		}
	}

}
