import { Router } from 'express';
import { getLinkStats, getAllLinks, getLink, insertLink } from '../controllers/linkController'; // Importera statistik-funktionen
import { apiKeyAuth } from '../middlewares/authMiddleware';
import { verifyCode } from '../controllers/authController';
import { getAPIStatus } from '../controllers/statusController';
import { addLinkBlacklist, removeLinkBlacklist, getBlacklist, checkLinkBlacklist } from '../controllers/blacklistController';

/**
 * Router for API endpoints.
 * Handles requests to /api/* routes.
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
apiRouter.get('/status', async (req, res) => { getAPIStatus(req, res);});

/**
 * POST /api/auth/verify-code
 * Endpoint to verify the authentication code.
 * Delegates the request handling to the verifyCode utility function.
 */
apiRouter.post("/auth/verify-code", async (req, res) => { verifyCode(req, res); });

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

/**
 * POST /api/blacklist
 * Adds a link to the blacklist.
 * Delegates the request handling to the addLinkBlacklist utility function.
 */
apiRouter.post('/blacklist', async (req, res) => { addLinkBlacklist(req, res); });

/**
 * GET /api/blacklist
 * Retrieves all links from the blacklist.
 * Delegates the request handling to the getBlacklist utility function.
 */
apiRouter.get('/blacklist', async (req, res) => { getBlacklist(req, res); });

/**
 * DELETE /api/blacklist/:url
 * Removes a link from the blacklist.
 * Delegates the request handling to the removeLinkBlacklist utility function.
 */
apiRouter.delete('/blacklist/:url', async (req, res) => { removeLinkBlacklist(req, res); });

/**
 * POST /api/blacklist/:url
 * Checks if a link is in the blacklist.
 * Delegates the request handling to the checkLinkBlacklist utility function.
 */
apiRouter.post('/blacklist/:url', async (req, res) => { checkLinkBlacklist(req, res); });

export default apiRouter;