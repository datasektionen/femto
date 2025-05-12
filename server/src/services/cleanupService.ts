import cron from 'node-cron';
import pool from '../db';

/**
 * Removes expired links from the database
 */
async function cleanupExpiredLinks(): Promise<void> {
  const client = await pool.connect();
  try {

    // Debug all with expires
    const all = await client.query(
      "SELECT slug, expires FROM urls WHERE expires IS NOT NULL"
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
  
  // Schedule the job according to the cron expression
  cron.schedule(cronSchedule, () => {
    cleanupExpiredLinks();
  });
  
  // Also run an initial cleanup when the server starts
  cleanupExpiredLinks();
}