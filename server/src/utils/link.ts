import { Request, Response } from 'express';
import pool from '../db';

/**
 * Generates a short link, either using a provided slug or generating a new one.
 *
 * @param {any} req - Express request object.
 * @param {any} res - Express response object.
 * @returns {Promise<void>} - A promise that resolves when the link is generated and the response is sent.
 */
export async function insertLink(req: Request, res: Response): Promise<void> {
    const { slug, url, user_id, description, mandate, expires } = req.body;

    //Generates a base62 slug from a given number.
    function generateBase62(id: number) {
        // Characters used for base62 encoding
        const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const base = characters.length;
        let slug = '';

        // Convert the ID to a base62 string
        while (id > 0) {
            slug = characters[id % base] + slug;
            id = Math.floor(id / base);
        }

        return slug;
    }

    // Checks if a slug is already in the database.
    async function checkSlug(slug: string) {
        let client;
        try {
            client = await pool.connect();
            const result = await client.query('SELECT * FROM urls WHERE slug = $1', [slug]);
            return result.rows.length > 0;
        } catch (err: any) {
            console.error('Error executing query', err.stack);
            return false;
        } finally {
            if (client) {
                client.release();
            }
        }
    }

    if (slug) {
        // If a slug is provided, check if it's already taken
        const slugAlreadyTaken = await checkSlug(slug);

        if (slugAlreadyTaken) {
            // If the slug is taken, return a 409 Conflict response
            res.status(409).send('Slug has already been taken');
            return;
        }

        let client;
        try {
            client = await pool.connect();
            // Insert the new link with the provided slug
            const result = await client.query('INSERT INTO urls (slug, url, user_id, description, mandate, expires) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [slug, url, user_id, description, mandate, expires]);
            res.status(201).json(result.rows[0]);
        } catch (err: any) {
            console.error('Error executing query', err.stack);
            res.status(500).send('Internal Server Error');
        } finally {
            if (client) {
                client.release();
            }
        }
    } else {
        // If no slug is provided, generate a new one
        let client;
        try {
            client = await pool.connect();

            // Insert the new link without a slug, and retrieve the generated ID
            const idResult = await client.query('INSERT INTO urls (url, user_id, description, mandate, expires) VALUES ($1, $2, $3, $4, $5) RETURNING id', [url, user_id, description, mandate, expires]);
            const id = idResult.rows[0].id;
            // Generate a base62 slug from the ID
            const slug = generateBase62(id);

            // Update the link with the generated slug
            await client.query('UPDATE urls SET slug = $1 WHERE id = $2', [slug, id]);

            // Retrieve the newly created link
            const result = await client.query('SELECT * FROM urls WHERE id = $1', [id]);
            res.status(201).json(result.rows[0]);

        } catch (err: any) {
            console.error('Error executing query', err.stack);
            res.status(500).send('Internal Server Error');
        } finally {
            if (client) {
                client.release();
            }
        }
    }
}

/**
 * Retrieves all links from the database.
 *
 * @param {any} req - Express request object.
 * @param {any} res - Express response object.
 * @returns {Promise<void>} - A promise that resolves when the links are retrieved and the response is sent.
 */
export async function getAllLinks(req: Request, res: Response): Promise<void> {
    let client;
    try {
        // Connect to the database
        client = await pool.connect();

        // Execute the query to retrieve all links
        const result = await client.query('SELECT * FROM urls');

        // Send the retrieved links as a JSON response
        res.status(200).json(result.rows);
    } catch (err: any) {
        // Log the error and send a 500 status code if an error occurs
        console.error('Error retrieving links', err.stack);
        res.status(500).send('Internal Server Error');
    } finally {
        // Release the client back to the pool
        if (client) {
            client.release();
        }
    }
}

/**
 * Retrieves a single link from the database based on the provided slug.
 *
 * @param {any} req - Express request object.
 * @param {any} res - Express response object.
 * @returns {Promise<void>} - A promise that resolves when the link is retrieved and the response is sent.
 */
export async function getLink(req: Request, res: Response): Promise<void> {
    const { slug } = req.params;
    let client;
    try {
        // Connect to the database
        client = await pool.connect();

        // Execute the query to retrieve the link with the specified slug
        const result = await client.query('SELECT * FROM urls WHERE slug = $1', [slug]);

        // Check if the link was found
        if (result.rows.length === 0) {
            // Send a 404 status code if the link was not found
            res.status(404).send('Link not found');
        } else {
            // Send the retrieved link as a JSON response
            res.status(200).json(result.rows[0]);
        }
    } catch (err: any) {
        // Log the error and send a 500 status code if an error occurs
        console.error('Error retrieving link', err.stack);
        res.status(500).send('Internal Server Error');
    } finally {
        // Release the client back to the pool
        if (client) {
            client.release();
        }
    }
}

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
