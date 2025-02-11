import { Router } from 'express';
import pool from '../db';

/**
 * Router for redirection based on slugs.
 * Handles requests to /* routes.
 * 
 * Routes:
 * - GET /: Redirects to 'https://datasektionen.se'
 * - GET /:slug: Redirects to the URL associated with the slug
 */
const redirectRouter = Router();

// Root redirect to datasektionen.se
redirectRouter.get('/', (req, res) => {
    res.status(301).location('https://datasektionen.se').end();
});

// Redirect to the URL associated with the slug
redirectRouter.get('/:slug', async (req, res) => {
    const slug = req.params.slug;

    // Query the database for the URL associated with the slug
    let client;
    try {
        client = await pool.connect();
        const result = await client.query('SELECT url FROM urls WHERE slug = $1', [slug]);

        // If a URL is found, redirect to it
        if (result.rows.length > 0) {
            res.status(301).location(result.rows[0].url).end();
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