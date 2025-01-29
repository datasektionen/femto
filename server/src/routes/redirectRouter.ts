import { Router } from 'express';
import client from '../db';
import path from 'path';

const redirectRouter = Router();

// Define redirect routes
redirectRouter.get('/', (req, res) => {
    res.status(301).location('https://datasektionen.se').end();
});

redirectRouter.get('/:slug', async (req, res) => {
    const slug = req.params.slug;

    if (slug === 'femto') {
        res.sendFile(path.join(__dirname, '../build', 'index.html'));
        return;
    }

    try {
        const result = await client.query('SELECT url FROM urls WHERE slug = $1', [slug]);

        if (result.rows.length > 0) {
            res.status(301).location(result.rows[0].url).end();
        } else {
            res.status(404).send('Slug not found');
        }
    } catch (err: any) {
        console.error('Error executing query', err.stack);
        res.status(500).send('Internal Server Error');
    }
});

export default redirectRouter;