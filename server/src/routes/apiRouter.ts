import { Router } from 'express';
import client from '../db';

/**
 * Router for API endpoints.
 * Handles requests to /api/* routes.
 * 
 * Routes:
 * - GET /api/status: Returns the current status of the API and the current time from the database
 */
const apiRouter = Router();

// Status route
apiRouter.get('/status', async (req, res) => {
    // Query the database for the current time
    try {
        const result = await client.query('SELECT NOW()');
        res.json({ status: 'API is running', time: result.rows[0].now });
    } catch (err: any) {
        console.error('Error executing query', err.stack);
        res.status(500).send('Internal Server Error');
    }
});

export default apiRouter;