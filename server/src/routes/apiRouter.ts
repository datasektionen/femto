import { Router } from 'express';
import client from '../db';

/**
 * Router for API endpoints.
 * Handles requests to /api/* routes.
 * 
 * Routes:
 * - GET /api/status: Returns the current status of the API and the current time from the database
 * - POST /api/links: Creates a new link
 * - GET /api/links: Retrieves all links
 * 
 * TODO: Add authentication and authorization to the API routes.
 */
const apiRouter = Router();

/**
 * GET /api/status
 * Returns the current status of the API and the current time from the database.
 * 
 * @returns {200} - The current status of the API and the current time from the database
 * @returns {500} - If there is an internal server error
 */
apiRouter.get('/status', async (req, res) => {
    // Query the database for the current time
    try {
        const result = await client.query('SELECT NOW()');
        res.status(200).json({ status: 'API is running', time: result.rows[0].now });
    } catch (err: any) {
        console.error('Error executing query', err.stack);
        res.status(500).send('Internal Server Error');
    }
});

/**
 * POST /api/links
 * Creates a new link.
 * 
 * @param {string} slug - The slug for the new link
 * @param {string} url - The URL for the new link
 * @param {string} user_id - The user identifier for the new link
 * @param {string} description - The description for the new link
 * @param {string} mandate - The mandate for the new link
 * @param {string} expires - The expiry date for the new link
 * @returns {201} - If the link is created successfully
 * @returns {500} - If there is an internal server error
 */
apiRouter.post('/links', async (req, res) => {
    const { slug, url, user_id, description, mandate, expires } = req.body;

    try {
        await client.query(
            'INSERT INTO urls (slug, url, user_id, description, mandate, expires) VALUES ($1, $2, $3, $4, $5, $6)', 
            [slug, url, user_id, description, mandate, expires]
        );
        res.status(201).send('Link created successfully');
    } catch (err: any) {
        console.error('Error creating link', err.stack);
        res.status(500).send('Internal Server Error');
    }
});

/**
 * GET /api/links
 * Retrieves all links.
 * 
 * @returns {200} - An array of links
 * @returns {500} - If there is an internal server error
 */
apiRouter.get('/links', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM urls');
        res.status(200).json(result.rows);
    } catch (err: any) {
        console.error('Error retrieving links', err.stack);
        res.status(500).send('Internal Server Error');
    }
});

export default apiRouter;