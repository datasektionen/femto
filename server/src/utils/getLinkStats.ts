// server/src/utils/getLinkStats.ts

import { Request, Response } from 'express';
import pool from '../db';

/**
 * GET /api/links/:slug/stats
 * Returnerar en array av { date, clicks } över tid
 */
export async function getLinkStats(req: Request, res: Response): Promise<void> {
    const { slug } = req.params;
    let client;

    try {
        client = await pool.connect();

        // Kolla först att länken finns
        const linkResult = await client.query('SELECT id FROM urls WHERE slug = $1', [slug]);
        if (linkResult.rows.length === 0) {
            res.status(404).json({ error: 'Link not found' });
            return; // Avbryt funktionen här
        }

        const urlId = linkResult.rows[0].id;

        // Gruppar antalet klick per dag
        const statsResult = await client.query(`
            SELECT
                DATE_TRUNC('day', clicked_at) AS date,
                COUNT(*) AS clicks
            FROM url_clicks
            WHERE url_id = $1
            GROUP BY 1
            ORDER BY 1
        `, [urlId]);

        // Mappa resultatet till ett array-objekt { date, clicks }
        const data = statsResult.rows.map((row: any) => ({
            date: row.date.toISOString().split('T')[0], // ex: "2025-01-01"
            clicks: Number(row.clicks),
        }));

        res.json(data);
    } catch (err: any) {
        console.error('Error retrieving link stats', err.stack);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        if (client) {
            client.release();
        }
    }
}
