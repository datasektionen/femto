import { Request, Response } from 'express';
import { Readable } from 'stream';
import * as readline from 'readline';
import pool from "../services/db";
import multer from 'multer';

// Multer configuration for file uploads
export const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 } // 100 MB
});


export interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

/**
 * Queries database for given link and returns true if it is blacklisted.
 * Blocks main domains and all their subdomains.
 * @param {string} link - The link to check.
 * @returns {Promise<boolean>} - True if the link is in the blacklist, false otherwise.
 */
export async function isBlacklisted(link: string): Promise<boolean> {
    let client;

    try {
        const url = new URL(link);
        let hostname = url.hostname.toLowerCase();

        // Remove www prefix if present
        if (hostname.startsWith('www.')) {
            hostname = hostname.substring(4);
        }

        client = await pool.connect();

        // Check if any parent domain is blacklisted
        // For example: api.sub.example.com will check api.sub.example.com, sub.example.com, example.com
        const domainParts = hostname.split('.');

        for (let i = 0; i < domainParts.length - 1; i++) {
            const domainToCheck = domainParts.slice(i).join('.');

            const result = await client.query(
                'SELECT 1 FROM blockedurls WHERE url = $1 LIMIT 1',
                [domainToCheck]
            );

            if (result.rowCount && result.rowCount > 0) {
                return true;
            }
        }

        return false;

    } catch (err: any) {
        console.warn(`[Blacklist] ❌ Error checking blacklist for "${link}":`, err.message);
        return false;
    } finally {
        if (client) {
            client.release();
        }
    }
}

/**
 * Extracts domain from hosts file entry (e.g., "0.0.0.0 example.com" -> "example.com")
 * @param {string} line - The line from the hosts file
 * @returns {string | null} - The extracted domain or null if invalid
 */
function extractDomainFromHostsLine(line: string): string | null {
    const trimmedLine = line.trim();

    // Skip comments and empty lines
    if (!trimmedLine || trimmedLine.startsWith('#')) {
        return null;
    }

    // Handle hosts file format: "0.0.0.0 domain.com" or "127.0.0.1 domain.com"
    const parts = trimmedLine.split(/\s+/);
    if (parts.length >= 2) {
        const ip = parts[0];
        const domain = parts[1];

        // Validate IP format (basic check)
        if (/^(0\.0\.0\.0|127\.0\.0\.1)$/.test(ip)) {
            // Validate domain format (basic check)
            if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
                return domain.toLowerCase();
            }
        }
    }

    // Handle plain domain format
    if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedLine)) {
        return trimmedLine.toLowerCase();
    }

    return null;
}

interface DatabaseInsertResult {
    processedCount: number;
    insertedCount: number;
    skippedCount: number;
}

/**
 * Adds given domains to the database blacklist "blockedurls" in batches.
 * @param {string[]} domains - The domains to add to the blacklist.
 * @returns {Promise<DatabaseInsertResult>} - Result with counts of processed, inserted, and skipped domains
 */
async function databaseInsertBlacklist(domains: string[]): Promise<DatabaseInsertResult> {
    const BATCH_SIZE = 100;
    const PROGRESS_INTERVAL = 10000;

    let client;
    let processedCount = 0;
    let insertedCount = 0;
    let skippedCount = 0;

    try {
        client = await pool.connect();

        const totalDomains = domains.length;
        if (totalDomains === 0) {
            console.log("[Blacklist] ℹ️ No domains to add to the blacklist.");
            return { processedCount: 0, insertedCount: 0, skippedCount: 0 };
        }

        console.log(`[Blacklist] ℹ️ Starting to insert ${totalDomains} domains into blacklist...`);

        // Process domains in batches
        for (let i = 0; i < domains.length; i += BATCH_SIZE) {
            const batch = domains.slice(i, i + BATCH_SIZE);

            try {
                // Create parameterized query for batch insert that returns inserted rows
                const placeholders = batch.map((_, index) => `($${index + 1})`).join(', ');
                const query = `
                    INSERT INTO blockedurls (url) 
                    VALUES ${placeholders} 
                    ON CONFLICT (url) DO NOTHING
                    RETURNING url;
                `;

                const result = await client.query(query, batch);
                const batchInsertedCount = result.rowCount || 0;
                const batchSkippedCount = batch.length - batchInsertedCount;

                processedCount += batch.length;
                insertedCount += batchInsertedCount;
                skippedCount += batchSkippedCount;

                // Log progress
                if (processedCount % PROGRESS_INTERVAL === 0 || processedCount === totalDomains) {
                    const progress = Math.round((processedCount / totalDomains) * 100);
                    console.log(`[Blacklist] ℹ️ Progress: ${processedCount}/${totalDomains} domains (${progress}%) - Inserted: ${insertedCount}, Skipped: ${skippedCount}`);
                }

            } catch (err: any) {
                console.error(`[Blacklist] ❌ Error inserting batch starting at index ${i}:`, err.message);
                // Count failed batch as skipped
                skippedCount += batch.length;
                processedCount += batch.length;
            }
        }

        console.log(`[Blacklist] ✅ Completed: ${processedCount}/${totalDomains} domains processed - Inserted: ${insertedCount}, Skipped: ${skippedCount}`);

        return { processedCount, insertedCount, skippedCount };

    } catch (err: any) {
        console.error('[Database] ❌ Database connection error:', err.message);
        throw err;
    } finally {
        if (client) {
            client.release();
        }
    }
}

/**
 * Processes uploaded hosts file and adds domains to blacklist.
 * Supports both hosts file format (0.0.0.0 domain.com) and plain domain lists.
 * @param {MulterRequest} req - File upload request
 * @param {Response} res - Response object
 */
export async function blacklistFile(req: MulterRequest, res: Response): Promise<void> {
    console.log('[Blacklist] ℹ️ Processing blacklist file upload...');

    // Simplified permission handling
    const userPermissions = Array.isArray(req.user?.permissions)
        ? req.user.permissions.map((perm: string | { id: string }) =>
            typeof perm === "string" ? perm : (perm as { id: string }).id
        )
        : [];

    if (!userPermissions.includes('manage-blacklist')) {
        res.status(403).json({ error: 'Otillräckliga behörigheter' });
        return;
    }

    try {
        // Validate file upload
        if (!req.file) {
            res.status(400).json({ error: 'Ingen fil' });
            return;
        }

        if (!req.file.buffer || req.file.buffer.length === 0) {
            res.status(400).json({ error: 'Den uppladdade filen är tom' });
            return;
        }

        // Convert buffer to readable stream
        const bufferStream = new Readable();
        bufferStream.push(req.file.buffer);
        bufferStream.push(null);

        // Process file line by line
        const rl = readline.createInterface({
            input: bufferStream,
            crlfDelay: Infinity,
        });

        const domains: string[] = [];
        const invalidLines: string[] = [];

        // Process each line
        for await (const line of rl) {
            const domain = extractDomainFromHostsLine(line);
            if (domain) {
                domains.push(domain);
            } else if (line.trim() && !line.trim().startsWith('#')) {
                invalidLines.push(line.trim());
            }
        }

        // Remove duplicates
        const uniqueDomains = [...new Set(domains)];

        console.log(`[Blacklist] ℹ️ Extracted ${uniqueDomains.length} unique domains from ${req.file.originalname}`);
        if (invalidLines.length > 0) {
            console.log(`[Blacklist] ℹ️ Skipped ${invalidLines.length} invalid lines`);
        }

        // Insert domains into database and get results
        let insertResult = { processedCount: 0, insertedCount: 0, skippedCount: 0 };
        if (uniqueDomains.length > 0) {
            insertResult = await databaseInsertBlacklist(uniqueDomains);
        }

        // Send response with detailed statistics
        res.status(200).json({
            message: 'Fil bearbetad framgångsrikt',
            totalLines: domains.length,
            uniqueDomains: uniqueDomains.length,
            invalidLines: invalidLines.length,
            insertedDomains: insertResult.insertedCount,
            skippedDomains: insertResult.skippedCount,
            filename: req.file.originalname
        });

    } catch (error: any) {
        console.error('[Blacklist] ❌ Error processing blacklist file:', error.message);
        res.status(500).json({
            error: 'Lyckades inte bearbeta filen',
            details: error.message
        });
    }
}