import { downloadFile } from "../../utils/download.js";

/**
 * The Data and backups page (admin): where the agent keeps everything (GET /data), the backups (GET /data/backups), and
 * making, downloading and restoring one.
 *
 * @returns {object} Alpine component state and actions
 */
export function dataPage() {
	return {
		/** @type {boolean} True until the folders have answered */
		loading       : true,
		/** @type {string} Why the folders could not be read */
		failed        : "",
		/** @type {string} The data home */
		home          : "",
		/** @type {string} The database, when it is a file */
		database      : "",
		/** @type {Array<{ name: string, bytes: number, files: number }>} The folders of the data home */
		items         : [],
		/** @type {Array<{ name: string, mode: string, path: string }>} The volumes */
		volumes       : [],
		/** @type {boolean} True until the backups have answered */
		backupsLoading: true,
		/** @type {string} Why the backups could not be read */
		backupsFailed : "",
		/** @type {Array<{ name: string, bytes: number, madeAt: string }>} The backups, newest first */
		backups       : [],
		/** @type {{ name: string, scheduledAt?: string } | null} A restore waiting for the next start */
		pending       : null,
		/** @type {boolean} True while a backup is being made */
		making        : false,

		/** Loads the folders and the backups. */
		init() {
			this.loadFolders();
			this.loadBackups();
		},

		/** Reads where everything is kept. */
		async loadFolders() {
			const result = await this.$api.get( "/data" );
			this.loading = false;
			if ( !result.ok ) {
				this.failed = "Could not load the data folders.";
				return;
			}
			this.home = result.data.home || "";
			this.database = result.data.database || "";
			this.items = result.data.items || [];
			this.volumes = result.data.volumes || [];
		},

		/** Reads the backups and a restore that is waiting. */
		async loadBackups() {
			const result = await this.$api.get( "/data/backups" );
			this.backupsLoading = false;
			if ( !result.ok ) {
				this.backupsFailed = result.error || "Could not load the backups.";
				return;
			}
			this.backupsFailed = "";
			this.backups = result.data.backups || [];
			this.pending = result.data.pending && result.data.pending.name ? result.data.pending : null;
		},

		/** Makes a backup now. */
		async make() {
			this.making = true;
			const result = await this.$api.post( "/data/backup", {} );
			this.making = false;
			if ( result.ok ) {
				this.$toast.success( "Made " + result.data.name + " (" + this.$fmt.bytesText( result.data.bytes ) + ", " + result.data.entries + " files)." );
			} else {
				this.$toast.error( result.error || "Could not make a backup." );
			}
			await this.loadBackups();
		},

		/**
		 * Downloads a backup through the API (it needs the page's headers, so not a plain link).
		 *
		 * @param {{ name: string }} backup The backup
		 */
		async download( backup ) {
			if ( !await downloadFile( this.$api, "/data/backup?name=" + encodeURIComponent( backup.name ), backup.name ) ) {
				this.$toast.error( "Could not download " + backup.name + "." );
			}
		},

		/**
		 * Schedules a restore of a backup for the next start, once the person agrees.
		 *
		 * @param {{ name: string }} backup The backup
		 */
		async restore( backup ) {
			const yes = await this.$confirm( {
				title: "Restore " + backup.name + "?",
				body : "It is restored the next time the app starts. The data as it is now is kept as before-restore."
			} );
			if ( !yes ) {
				return;
			}
			const result = await this.$api.post( "/data/restore", { name: backup.name } );
			if ( result.ok ) {
				this.$toast.success( result.data.note || "Restore scheduled for the next start." );
			} else {
				this.$toast.error( result.error || "Could not schedule the restore." );
			}
			await this.loadBackups();
		}
	};
}
