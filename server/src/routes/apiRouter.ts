import { Router } from 'express';
import pool from '../db';
import { getLinkStats, getAllLinks, getLink, insertLink } from '../utils/link'; // Importera statistik-funktionen
import { apiKeyAuth } from '../middleware/auth';
import { checkToken } from '../utils/token';

/**
 * Router for API endpoints.
 * Handles requests to /api/* routes.
 * 
 * TODO: Add authentication and authorization to the API routes.
 */
const apiRouter = Router();

// Apply the apiKeyAuth middleware to all routes under the apiRouter.
// This ensures that any request to the /api/* endpoints must include a valid API key in the Authorization header.
apiRouter.use(apiKeyAuth);

/**
 * GET /api/status
 * Endpoint to check the status of the API.
 * Queries the database for the current time and returns it.
 */
apiRouter.get('/status', async (req, res) => {
    // Query the database for the current time
    let client;
    try {
        client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        res.status(200).json({ message: 'Authorized access', status: 'API is running', time: result.rows[0].now });
    } catch (err: any) {
        console.error('Error executing query', err.stack);
        res.status(500).send('Internal Server Error');
    } finally {
        if (client) {
            client.release();
        }
    }
});

/**
 * POST /api/auth/verify-token
 * Endpoint to verify a user's token.
 */
apiRouter.post("/auth/verify-token", async (req, res) => { checkToken(req, res); });

/**
 * GET /api/stats
 * Hämtar statistik för länkar: totalt antal länkar och sammanlagda klick.
 */
// GET /api/links/:slug/stats
apiRouter.get('/links/:slug/stats', getLinkStats);

/**
 * POST /api/links
 * Endpoint to insert a new link.
 * Delegates the request handling to the insertLink utility function.
 */
apiRouter.post('/links', async (req, res) => { insertLink(req, res); });

/**
 * GET /api/links
 * Endpoint to get all links.
 * Delegates the request handling to the getAllLinks utility function.
 */
apiRouter.get('/links', async (req, res) => { getAllLinks(req, res); });

/**
 * GET /api/links/:slug
 * Endpoint to get a specific link by its slug.
 * Delegates the request handling to the getLink utility function.
 */
apiRouter.get('/links/:slug', async (req, res) => { getLink(req, res); });

export default apiRouter;