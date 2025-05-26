import cron from 'node-cron';
import pool from '../services/db'; // Adjust the import path as necessary

interface CleanupResult {
    deletedCount: number;
    deletedSlugs: string[];
}

/**
 * Removes expired links from the database using a single query
 * @returns Promise<CleanupResult> - Object containing deletion count and deleted slugs
 */
async function cleanupExpiredLinks(): Promise<CleanupResult> {
    let client;
    
    try {
        client = await pool.connect();
        
        // Single query: delete expired links and return their slugs
        const result = await client.query(
            "DELETE FROM urls WHERE expires IS NOT NULL AND expires < NOW() RETURNING slug"
        );
        
        const deletedSlugs = result.rows.map(row => row.slug);
        const deletedCount = result.rowCount || 0;
        
        if (deletedCount > 0) {
            console.log(`🗑️ Cleanup completed: Deleted ${deletedCount} expired link(s)`);
            console.log(`   Deleted slugs: ${deletedSlugs.join(', ')}`);
        } else {
            console.log('✅ Cleanup completed: No expired links found');
        }
        
        return { deletedCount, deletedSlugs };
        
    } catch (error: any) {
        console.error('❌ Error during cleanup:', error.message);
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
}

/**
 * Checks and removes a specific expired link
 * @param slug - The slug of the link to check and potentially delete
 * @returns Promise<boolean> - True if the link was expired and deleted, false otherwise
 */
export async function checkExpiredLink(slug: string): Promise<boolean> {
    if (!slug || typeof slug !== 'string') {
        console.warn('⚠️ Invalid slug provided to checkExpiredLink');
        return false;
    }
    
    let client;
    
    try {
        client = await pool.connect();
        
        // Single query: delete if expired and return the slug
        const result = await client.query(
            "DELETE FROM urls WHERE slug = $1 AND expires IS NOT NULL AND expires < NOW() RETURNING slug",
            [slug]
        );
        
        const wasDeleted = (result.rowCount ?? 0) > 0;
        
        if (wasDeleted) {
            console.log(`✅ Deleted expired link: ${slug}`);
        } else {
            // Check if link exists but is not expired (optional logging)
            const existsResult = await client.query(
                "SELECT expires FROM urls WHERE slug = $1",
                [slug]
            );
            
            if (existsResult.rowCount === 0) {
                console.log(`ℹ️ Link not found: ${slug}`);
            } else {
                console.log(`ℹ️ Link exists but not expired: ${slug}`);
            }
        }
        
        return wasDeleted;
        
    } catch (error: any) {
        console.error(`❌ Error checking expired link ${slug}:`, error.message);
        return false;
    } finally {
        if (client) {
            client.release();
        }
    }
}

/**
 * Schedules the cleanup job to run at regular intervals
 * @param cronSchedule - Cron expression for the schedule (default: every day at midnight)
 * @param runOnStart - Whether to run cleanup immediately when scheduling (default: true)
 */
export function scheduleCleanupJob(
    cronSchedule: string = '0 0 * * *', // Default: daily at midnight
    runOnStart: boolean = true
): void {
    try {
        // Validate cron expression
        if (!cron.validate(cronSchedule)) {
            throw new Error(`Invalid cron expression: ${cronSchedule}`);
        }
        
        console.log(`📅 Scheduling cleanup job with pattern: ${cronSchedule}`);
        
        // Schedule the job
        cron.schedule(cronSchedule, async () => {
            console.log('🚀 Running scheduled cleanup...');
            try {
                await cleanupExpiredLinks();
            } catch (error: any) {
                console.error('❌ Scheduled cleanup failed:', error.message);
            }
        });
        
        // Run initial cleanup if requested
        if (runOnStart) {
            console.log('🚀 Running initial cleanup...');
            cleanupExpiredLinks().catch(error => {
                console.error('❌ Initial cleanup failed:', error.message);
            });
        }
        
        console.log('✅ Cleanup service initialized successfully');
        
    } catch (error: any) {
        console.error('❌ Failed to schedule cleanup job:', error.message);
        throw error;
    }
}

/**
 * Manually trigger cleanup (useful for testing or manual maintenance)
 * @returns Promise<CleanupResult> - Result of the cleanup operation
 */
export async function triggerCleanup(): Promise<CleanupResult> {
    console.log('🔧 Manual cleanup triggered...');
    return await cleanupExpiredLinks();
}