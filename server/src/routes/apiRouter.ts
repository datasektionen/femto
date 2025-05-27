import { Router } from 'express';
import { deleteLink, updateLink, getLinkStats, getAllLinks, getLink, insertLink, getLangstats } from '../controllers/linkController';
import { verifyCode, getUserData } from '../controllers/authController';
import { getAPIStatus } from '../controllers/statusController';
import { blacklistFile } from '../controllers/blacklistController';
import { jwtAuth } from '../middlewares/jwtAuthMiddleware';
import { upload, MulterRequest } from '../controllers/blacklistController';

/**
 * Router for API endpoints.
 * Handles requests to /api/* routes.
 */
const apiRouter = Router();

// --- Public Routes ---

/**
 * GET /api/status
 * Checks the status of the API.
 * Queries the database for the current time and returns it.
 */
apiRouter.get('/status', async (req, res) => { getAPIStatus(req, res); });

/**
 * POST /api/auth/verify-code
 * Verifies the authentication code provided by the user.
 * Delegates the request handling to the verifyCode controller.
 */
apiRouter.post("/auth/verify-code", async (req, res) => { verifyCode(req, res); });

// --- JWT Authentication Middleware ---
// All routes defined below this line require a valid JWT token.
apiRouter.use(jwtAuth);

// --- Authenticated Routes ---

// -- User Authentication & Data --

/**
 * GET /api/auth/user-data
 * Retrieves data for the authenticated user.
 * Delegates the request handling to the getUserData controller.
 */
apiRouter.get('/auth/user-data', getUserData);

// -- Link Management --

/**
 * POST /api/links
 * Creates a new shortened link.
 * Requires authentication.
 * Delegates the request handling to the insertLink controller.
 */
apiRouter.post('/links', async (req, res) => { insertLink(req, res); });

/**
 * GET /api/links
 * Retrieves all links associated with the authenticated user.
 * Requires authentication.
 * Delegates the request handling to the getAllLinks controller.
 */
apiRouter.get('/links', async (req, res) => { getAllLinks(req, res); });

/**
 * GET /api/links/:slug
 * Retrieves a specific link by its slug.
 * Requires authentication.
 * Delegates the request handling to the getLink controller.
 */
apiRouter.get('/links/:slug', async (req, res) => { getLink(req, res); });

/**
 * DELETE /api/links/:slug
 * Deletes a specific link by its slug.
 * Requires authentication.
 * Delegates the request handling to the removeLink controller.
 */
apiRouter.delete('/links/:slug', async (req, res) => { deleteLink(req, res); });

/**
 * PATCH /api/links/:slug
 * Updates a specific link by its slug.
 * Requires authentication.
 * Delegates the request handling to the updateLink controller.
 */
apiRouter.patch('/links/:slug', async (req, res) => { updateLink(req, res); });

/**
 * GET /api/links/:slug/stats
 * Retrieves statistics (total clicks) for a specific link.
 * Requires authentication.
 * Delegates the request handling to the getLinkStats controller.
 */
apiRouter.get('/links/:slug/stats', getLinkStats);

/**
 * GET /api/links/:slug/lang-stats
 * Retrieves language-based statistics for a specific link.
 * Requires authentication.
 * Delegates the request handling to the getLangstats controller.
 */
apiRouter.get('/links/:slug/lang-stats', getLangstats);


// -- Blacklist Management --
/**
 * POST /api/blacklist/upload
 * Uploads a file containing URLs to add to the blacklist.
 * Requires authentication.
 * Expects a 'file' field in the multipart/form-data request.
 */
apiRouter.post('/blacklist/upload', upload.single('file'), async (req: MulterRequest, res) => { blacklistFile(req, res); });

export default apiRouter;