// server/src/routes/redirectRouter.ts

import { Router } from 'express';
import pool from '../db';

const redirectRouter = Router();

// Rot-omdirigering till datasektionen.se
redirectRouter.get('/', (req, res) => {
    res.status(301).location('https://datasektionen.se').end();
});

// GET /:slug => Hämta länk, öka klick, logga klick och omdirigera
redirectRouter.get('/:slug', async (req, res) => {
    const slug = req.params.slug;
    let client;
    try {
        client = await pool.connect();
        // Hämta URL och dess ID baserat på slug
        const result = await client.query('SELECT id, url FROM urls WHERE slug = $1', [slug]);

        if (result.rows.length > 0) {
            const urlId = result.rows[0].id;
            const redirectUrl = result.rows[0].url;

            // Uppdatera totala klick i urls-tabellen
            await client.query('UPDATE urls SET clicks = clicks + 1 WHERE id = $1', [urlId]);

            // Logga klicket i url_clicks-tabellen
            await client.query('INSERT INTO url_clicks (url_id) VALUES ($1)', [urlId]);

            // Omdirigera
            res.status(301).location(redirectUrl).end();
        } else {
            res.status(404).send('Slug not found');
        }
    } catch (err: any) {
        console.error('Error executing query', err.stack);
        res.status(500).send('Internal Server Error');
    } finally {
        if (client) {
            client.release();
        }
    }
});

export default redirectRouter;