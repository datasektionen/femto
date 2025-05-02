import { Router } from 'express';
import { getLinkStats, getAllLinks, getLink, insertLink, getLangstats } from '../controllers/linkController';
import { verifyCode, getUserData, fetchUserPermissions, fetchUserMemberships } from '../controllers/authController'; // Added missing imports
import { getAPIStatus } from '../controllers/statusController';
import { addLinkBlacklist, removeLinkBlacklist, getBlacklist, checkLinkBlacklist } from '../controllers/blacklistController';
import { jwtAuth } from '../middlewares/jwtAuthMiddleware';
import axios from 'axios';
import multer from 'multer';
import { Request, Response } from 'express';
import { Readable } from 'stream';
import * as readline from 'readline';
import { databaseInsertBlacklist } from '../services/blacklist';

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

// Interface for Multer file handling
interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * POST /api/blacklist/upload
 * Uploads a file containing URLs to add to the blacklist.
 * Requires authentication.
 * Expects a 'file' field in the multipart/form-data request.
 */
apiRouter.get('/blacklist/upload', upload.single('file'), async (req: MulterRequest, res) => { 

    console.log('blacklistFile called');
      const multerReq = req as Request; // Explicitly cast req to MulterRequest
      try {
          if (!multerReq.file) {
            res.status(400).send('No file uploaded');
            return;
          }
      
          // Convert buffer to stream
          const bufferStream = new Readable();
          if (req.file) {
            bufferStream.push(req.file.buffer);
          } else {
            res.status(400).send('No file uploaded');
            return;
          }
          bufferStream.push(null);
      
          const rl = readline.createInterface({
            input: bufferStream,
            crlfDelay: Infinity,
          });
  
          const lines: string[] = [];
          rl.on('line', (line: string) => {
            if (line.startsWith("#")) return; // Skip comments
            lines.push(line.trim());
          });
  
          await databaseInsertBlacklist(lines);
  
          
          console.log('File processed and links blacklisted successfully.');
  
          
          res.status(200).send(lines);
        } catch (error) {
          console.error(error);
          res.status(500).send('Error processing file.');
        }
  
  } ); 


/* --- Commented out Blacklist Routes ---
 * These routes are currently inactive. Uncomment to enable manual blacklist management via API.
 */

/**
 * POST /api/blacklist
 * Adds a single URL to the blacklist.
 * Requires authentication.
 * Expects { "url": "some_url" } in the request body.
 */
// apiRouter.post('/blacklist', async (req, res) => { addLinkBlacklist(req, res); });

/**
 * GET /api/blacklist
 * Retrieves all URLs currently in the blacklist.
 * Requires authentication.
 */
// apiRouter.get('/blacklist', async (req, res) => { getBlacklist(req, res); });

/**
 * DELETE /api/blacklist/:url
 * Removes a specific URL from the blacklist.
 * Requires authentication. The URL to remove should be URL-encoded in the path.
 */
// apiRouter.delete('/blacklist/:url', async (req, res) => { removeLinkBlacklist(req, res); });

/**
 * POST /api/blacklist/check/:url
 * Checks if a specific URL exists in the blacklist.
 * Requires authentication. The URL to check should be URL-encoded in the path.
 * Note: Changed from POST to GET for semantic correctness (checking state).
 */
// apiRouter.get('/blacklist/check/:url', async (req, res) => { checkLinkBlacklist(req, res); });


// --- Hive API Test Routes (for debugging) ---

/**
 * GET /api/test-hive/:username
 * Test endpoint to diagnose Hive API connection issues using Bearer token.
 * Requires authentication.
 */
apiRouter.get('/test-hive/:username', async (req, res) => {
    const username = req.params.username;
    const apiKey = process.env.HIVE_API_KEY;

    console.log(`🧪 Testing Hive API connection for user: ${username}`);
    console.log(`🔑 Using API key with Bearer authentication`);

    try {
        // Test permissions endpoint
        console.log("🔍 Testing permissions endpoint...");
        const permissionsResponse = await axios.get(
            `https://hive.datasektionen.se/api/v1/user/${username}/permissions`,
            { headers: { "Authorization": `Bearer ${apiKey}` } }
        );

        // Test memberships endpoint
        console.log("🔍 Testing memberships endpoint...");
        const membershipsResponse = await axios.get(
            `https://hive.datasektionen.se/api/v1/tagged/link-manager/memberships/${username}`,
            { headers: { "Authorization": `Bearer ${apiKey}` } }
        );

        res.json({
            success: true,
            permissions: { status: permissionsResponse.status, data: permissionsResponse.data },
            memberships: { status: membershipsResponse.status, data: membershipsResponse.data }
        });
    } catch (error: any) {
        console.error(`❌ Error testing Hive API for ${username}:`, error.message);
        res.status(error.response?.status || 500).json({
            success: false,
            message: error.message,
            responseData: error.response?.data,
            responseStatus: error.response?.status,
            responseHeaders: error.response?.headers,
            requestHeaders: error.request?._header // Note: _header might be internal detail
        });
    }
});

/**
 * GET /api/test-hive-alt/:username
 * Alternative test endpoint trying various Hive API authentication methods.
 * Requires authentication.
 */
apiRouter.get('/test-hive-alt/:username', async (req, res) => {
    const username = req.params.username;
    const apiKey = process.env.HIVE_API_KEY;

    console.log(`🧪 Testing alternative Hive API authentication methods for user: ${username}`);

    const authMethods = [
        { name: "X-API-Key header", headers: { "X-API-Key": apiKey } },
        { name: "Bearer token", headers: { "Authorization": `Bearer ${apiKey}` } },
        { name: "Token in Authorization", headers: { "Authorization": `Token ${apiKey}` } },
        { name: "API Key in Authorization", headers: { "Authorization": `ApiKey ${apiKey}` } },
        { name: "Lowercase x-api-key", headers: { "x-api-key": apiKey } }
    ];

    const results = [];
    let foundWorkingMethod = false;

    for (const method of authMethods) {
        try {
            console.log(`🔍 Testing permissions with ${method.name}...`);
            const response = await axios.get(
                `https://hive.datasektionen.se/api/v1/user/${username}/permissions?system=femto`,
                { headers: method.headers }
            );
            results.push({ method: method.name, success: true, status: response.status, data: response.data });
            console.log(`✅ Success with ${method.name}`);
            foundWorkingMethod = true;
            // break; // Optional: Stop after first success
        } catch (error: any) {
            results.push({
                method: method.name,
                success: false,
                status: error.response?.status,
                error: error.message,
                data: error.response?.data
            });
            console.log(`❌ Failed with ${method.name}: Status ${error.response?.status}`);
        }
    }

    // Test alternative endpoint format
    try {
        console.log("🔍 Testing alternative endpoint URL format...");
        const alternativeResponse = await axios.get(
            `https://hive.datasektionen.se/api/v1/permissions/${username}?system=femto`,
            // Use a known potentially working method for this test, e.g., X-API-Key or Bearer
            { headers: { "X-API-Key": apiKey } }
        );
        results.push({ method: "Alternative URL format", success: true, status: alternativeResponse.status, data: alternativeResponse.data });
        foundWorkingMethod = foundWorkingMethod || true;
    } catch (error: any) {
        results.push({
            method: "Alternative URL format",
            success: false,
            status: error.response?.status,
            error: error.message,
            data: error.response?.data
        });
        console.log(`❌ Failed with alternative URL format: Status ${error.response?.status}`);
    }

    res.json({
        success: foundWorkingMethod,
        results: results
    });
});

/**
 * GET /api/test-hive-user/:username
 * Direct test using the imported Hive authentication functions from authController.
 * Requires authentication.
 */
apiRouter.get('/test-hive-user/:username', async (req, res) => {
    const username = req.params.username;
    try {
        console.log(`🧪 Testing imported Hive API functions for user: ${username}`);
        // Functions are already imported at the top
        const permissions = await fetchUserPermissions(username);
        const mandates = await fetchUserMemberships(username);
        res.json({ success: true, permissions: permissions, mandates: mandates });
    } catch (error: any) {
        console.error(`❌ Error testing imported Hive functions for ${username}:`, error.message);
        res.status(500).json({ success: false, message: error.message || 'Unknown error occurred' });
    }
});


export default apiRouter;