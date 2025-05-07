import cron from 'node-cron';
import pool from '../db';

/**
 * Removes expired links from the database
 */
async function cleanupExpiredLinks(): Promise<void> {
  let client;
  try {
    client = await pool.connect();
    
    // Log the current time for comparison
    console.log(`🕒 Current server time: ${new Date().toISOString()}`);

    // Get and log all links with expiration dates for debugging
    const allLinksResult = await client.query(
      "SELECT slug, url, expires FROM urls WHERE expires IS NOT NULL"
    );
    
    console.log(`📊 Found ${allLinksResult.rows.length} links with expiration dates:`);
    allLinksResult.rows.forEach(link => {
      console.log(`  - ${link.slug}: expires ${new Date(link.expires).toISOString()} (DB: ${link.expires})`);
    });
    
    // Find and count expired links
    const countResult = await client.query(
      `
      SELECT COUNT(*) FROM urls
      WHERE expires IS NOT NULL
        AND expires < NOW() AT TIME ZONE 'Europe/Stockholm'
      `
    );
    
    const expiredCount = parseInt(countResult.rows[0].count);
    console.log(`🔍 Found ${expiredCount} expired links based on NOW() time`);
    
    // Get specific expired links for debugging
    const expiredResult = await client.query(
      "SELECT slug, url, expires FROM urls WHERE expires IS NOT NULL AND expires < NOW()"
    );
    
    if (expiredResult.rows.length > 0) {
      console.log(`📋 Expired links before deletion:`);
      expiredResult.rows.forEach(link => {
        console.log(`  - ${link.slug}: expires ${new Date(link.expires).toISOString()} (DB: ${link.expires})`);
      });
    }
    
    if (expiredCount > 0) {
      // Delete expired links
      const deleteResult = await client.query(
        `
        DELETE FROM urls
        WHERE expires IS NOT NULL
          AND expires < NOW() AT TIME ZONE 'Europe/Stockholm'
        RETURNING slug
        `
      );
      
      const deletedSlugs = deleteResult.rows.map(row => row.slug);
      console.log(`🧹 Cleaned up ${expiredCount} expired links: ${deletedSlugs.join(', ')}`);
    } else {
      console.log('✅ No expired links to clean up');
    }
  } catch (err) {
    console.error('❌ Error cleaning up expired links:', err);
  } finally {
    if (client) {
      client.release();
    }
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