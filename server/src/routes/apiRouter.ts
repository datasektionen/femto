import { Router } from 'express';
import { getLinkStats, getAllLinks, getLink, insertLink, getLangstats } from '../controllers/linkController'; // Importera statistik-funktionen
import { verifyCode } from '../controllers/authController';
import { getAPIStatus } from '../controllers/statusController';
import { addLinkBlacklist, removeLinkBlacklist, getBlacklist, checkLinkBlacklist } from '../controllers/blacklistController';
import { jwtAuth } from '../middlewares/jwtAuthMiddleware';
import axios from 'axios';

import multer from 'multer';

import { Request, Response } from 'express';
import { Readable } from 'stream';
import * as readline from 'readline';
import { databaseInsertBlacklist } from '../services/blacklist'; // Adjust the import path as necessary


/**
 * Router for API endpoints.
 * Handles requests to /api/* routes.
 */
const apiRouter = Router();

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



apiRouter.get('/links/:slug/lang-stats', jwtAuth, getLangstats);

// Apply jwtAuth middleware to protect the /api/links routes

apiRouter.use('/links', jwtAuth);
//apiRouter.use('/links', getAllLinks);

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
//apiRouter.post('/blacklist', async (req, res) => { addLinkBlacklist(req, res); });

/**
 * GET /api/blacklist
 * Retrieves all links from the blacklist.
 * Delegates the request handling to the getBlacklist utility function.
 */
//apiRouter.get('/blacklist', async (req, res) => { getBlacklist(req, res); });

/**
 * DELETE /api/blacklist/:url
 * Removes a link from the blacklist.
 * Delegates the request handling to the removeLinkBlacklist utility function.
 */
//apiRouter.delete('/blacklist/:url', async (req, res) => { removeLinkBlacklist(req, res); });

/**
 * POST /api/blacklist/:url
 * Checks if a link is in the blacklist.
 * Delegates the request handling to the checkLinkBlacklist utility function.
 */
//apiRouter.post('/blacklist/:url', async (req, res) => { checkLinkBlacklist(req, res); });

/**
 * GET /api/test-hive
 * Test endpoint to diagnose Hive API connection issues
 */
apiRouter.get('/test-hive/:username', async (req, res) => {
  const username = req.params.username;
  const apiKey = process.env.HIVE_API_KEY;
  
  console.log(`🧪 Testing Hive API connection for user: ${username}`);
  console.log(`🔑 Using API key with Bearer authentication`);
  
  try {
    // Test permissions endpoint with Bearer token
    console.log("🔍 Testing permissions endpoint...");
    const permissionsResponse = await axios.get(
      `https://hive.datasektionen.se/api/v1/user/${username}/permissions`,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      }
    );
    
    // Test memberships endpoint with Bearer token
    console.log("🔍 Testing memberships endpoint...");
    const membershipsResponse = await axios.get(
      `https://hive.datasektionen.se/api/v1/tagged/link-manager/memberships/${username}`,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      }
    );
    
    // Return both responses for analysis
    res.json({
      success: true,
      permissions: {
        status: permissionsResponse.status,
        data: permissionsResponse.data
      },
      memberships: {
        status: membershipsResponse.status,
        data: membershipsResponse.data
      }
    });
  } catch (error: any) {
    // Return detailed error information
    res.status(500).json({
      success: false,
      message: error.message,
      responseData: error.response?.data,
      responseStatus: error.response?.status,
      responseHeaders: error.response?.headers,
      requestHeaders: error.request?._header
    });
  }
});

/**
 * GET /api/test-hive-alt
 * Alternative test endpoint with different authentication methods
 */
apiRouter.get('/test-hive-alt/:username', async (req, res) => {
  const username = req.params.username;
  const apiKey = process.env.HIVE_API_KEY;
  
  console.log(`🧪 Testing alternative Hive API authentication methods for user: ${username}`);
  
  // Try multiple authentication methods
  const authMethods = [
    // Method 1: Original X-API-Key
    {
      name: "X-API-Key header",
      headers: { "X-API-Key": apiKey }
    },
    // Method 2: Bearer token in Authorization header
    {
      name: "Bearer token",
      headers: { "Authorization": `Bearer ${apiKey}` }
    },
    // Method 3: Token in Authorization header
    {
      name: "Token in Authorization",
      headers: { "Authorization": `Token ${apiKey}` }
    },
    // Method 4: API key in Authorization header
    {
      name: "API Key in Authorization",
      headers: { "Authorization": `ApiKey ${apiKey}` }
    },
    // Method 5: Lowercase x-api-key
    {
      name: "Lowercase x-api-key",
      headers: { "x-api-key": apiKey }
    }
  ];
  
  // Results array for storing responses from each attempt
  const results = [];
  
  // Try each authentication method
  for (const method of authMethods) {
    try {
      console.log(`🔍 Testing permissions with ${method.name}...`);
      
      const response = await axios.get(
        `https://hive.datasektionen.se/api/v1/user/${username}/permissions?system=femto`,
        { headers: method.headers }
      );
      
      results.push({
        method: method.name,
        success: true,
        status: response.status,
        data: response.data
      });
      
      console.log(`✅ Success with ${method.name}`);
      
      // If we found a working method, we can stop and return early
      break;
    } catch (error: any) {
      results.push({
        method: method.name,
        success: false,
        status: error.response?.status,
        error: error.message,
        data: error.response?.data
      });
      console.log(`❌ Failed with ${method.name}: ${error.response?.status}`);
    }
  }
  
  // Also try a different endpoint format to see if we're using the correct URL structure
  try {
    console.log("🔍 Testing alternative endpoint URL format...");
    const alternativeResponse = await axios.get(
      `https://hive.datasektionen.se/api/v1/permissions/${username}?system=femto`,
      { headers: { "X-API-Key": apiKey } }
    );
    
    results.push({
      method: "Alternative URL format",
      success: true,
      status: alternativeResponse.status,
      data: alternativeResponse.data
    });
  } catch (error: any) {
    results.push({
      method: "Alternative URL format",
      success: false,
      status: error.response?.status,
      error: error.message,
      data: error.response?.data
    });
  }
  
  // Return all results
  res.json({
    success: results.some(r => r.success), // True if any method worked
    results: results
  });
});

/**
 * GET /api/test-hive-user/:username
 * Direct test of the updated Hive authentication methods
 */
apiRouter.get('/test-hive-user/:username', async (req, res) => {
  const username = req.params.username;
  
  try {
    console.log(`🧪 Testing updated Hive API functions for user: ${username}`);
    
    // Import the functions from authController
    const { fetchUserPermissions, fetchUserMemberships } = require('../controllers/authController');
    
    // Call both functions with the username
    const permissions = await fetchUserPermissions(username);
    const mandates = await fetchUserMemberships(username);
    
    // Return the results
    res.json({
      success: true,
      permissions: permissions,
      mandates: mandates
    });
  } catch (error: any) { // Add type annotation to error
    res.status(500).json({
      success: false,
      message: error.message || 'Unknown error occurred'
    });
  }
});

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Endpoint to upload a blacklist file
apiRouter.post('/blacklist/upload', upload.single('file'), async (req: MulterRequest, res) => { 

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



export default apiRouter;