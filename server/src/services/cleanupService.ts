import cron from 'node-cron';
import pool from '../db';

/**
 * Removes expired links from the database
 */
async function cleanupExpiredLinks(): Promise<void> {
  const client = await pool.connect();
  try {
    console.log(`🕒 Current UTC: ${new Date().toISOString()}`);

    // Debug all with expires
    const all = await client.query(
      "SELECT slug, expires FROM urls WHERE expires IS NOT NULL"
    );
    all.rows.forEach(r =>
      console.log(`  - ${r.slug}: expires ${new Date(r.expires).toISOString()}`)
    );

    // Count & delete in UTC
    const { rows: [{ count }] } = await client.query(
      "SELECT COUNT(*) FROM urls WHERE expires < NOW()"
    );
    const expiredCount = parseInt(count, 10);

    if (expiredCount > 0) {
      const del = await client.query(
        "DELETE FROM urls WHERE expires < NOW() RETURNING slug"
      );
      console.log(`🧹 Removed ${expiredCount}: ${del.rows.map(r => r.slug).join(', ')}`);
    } else {
      console.log('✅ No expired links to clean up');
    }
  } finally {
    client.release();
  }
}

/**
 * Schedules the cleanup job to run at regular intervals
 * @param cronSchedule - cron expression for the schedule (default: every day at midnight)
 */
export function scheduleCleanupJob(cronSchedule = '0 0 * * *'): void {
  console.log(`🔄 Scheduling expired links cleanup job with schedule: ${cronSchedule}`);
  
  // Schedule the job according to the cron expression
  cron.schedule(cronSchedule, () => {
    console.log('⏰ Running scheduled cleanup of expired links');
    cleanupExpiredLinks();
  });
  
  // Also run an initial cleanup when the server starts
  cleanupExpiredLinks();
}