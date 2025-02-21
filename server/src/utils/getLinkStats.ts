// server/src/utils/getLinkStats.ts

import { Request, Response } from 'express';
import pool from '../db';

/**
 * GET /api/links/:slug/stats
 * Param: ?granularity=hour|day (valfritt, default "day")
 * Returnerar klick-data ENDAST för de tidpunkter där det faktiskt finns klick.
 */
export async function getLinkStats(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  const { granularity = 'day' } = req.query;  // t.ex. ?granularity=hour
  let client;

  try {
    client = await pool.connect();

    // 1. Verifiera att länken finns
    const linkResult = await client.query('SELECT id FROM urls WHERE slug = $1', [slug]);
    if (linkResult.rows.length === 0) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }
    const urlId = linkResult.rows[0].id;

    // 2. Tillåt endast "hour" eller "day"
    const validIntervals = ['hour', 'day'];
    const interval = validIntervals.includes(granularity as string) ? granularity : 'day';

    // 3. Gruppar klickdata per timme eller dag
    const statsResult = await client.query(
      `
        SELECT
          date_trunc('${interval}', clicked_at) AS date,
          COUNT(*) AS clicks
        FROM url_clicks
        WHERE url_id = $1
        GROUP BY 1
        ORDER BY 1
      `,
      [urlId]
    );

    // 4. Mappa resultatet till { date, clicks }
    const data = statsResult.rows.map((row: any) => ({
      date: row.date.toISOString(), // ex: "2025-01-01T09:00:00.000Z"
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
