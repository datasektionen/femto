import { Request, Response } from 'express';
import { Issuer, Client } from 'openid-client';
import jwt from 'jsonwebtoken';
import axios from 'axios';

//❗️openid-client version <= 5.0.0 is required for this code to work❗️

// Load environment variables
const OIDC_ISSUER = process.env.OIDC_ISSUER || 'https://sso.datasektionen.se';
const CLIENT_ID = process.env.CLIENT_ID || 'client-id';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'client-secret';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET;
const HIVE_API_KEY = process.env.HIVE_API_KEY;

if (!JWT_SECRET) {
    console.error("JWT_SECRET is not set in environment variables!");
    process.exit(1); // Exit if the secret is not defined
}

if (!HIVE_API_KEY) {
    console.error("HIVE_API_KEY is not set in environment variables!");
    process.exit(1); // Exit if the API key is not defined
}

// Declare mutable variable client, initialized as null
let client: Client | null = null;

// Initialize the OpenID client
async function initializeClient() {
    try {
        const issuer = await Issuer.discover(`${OIDC_ISSUER}/op/`);
        client = new issuer.Client({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uris: [`${CLIENT_URL}/auth/oidc-callback`],
            response_types: ['code'],
        });
        console.log('✅ OIDC client initialized 🔒');
    } catch (err: any) {
        console.error('❌ Error initializing OIDC client 🔒', err);
    }
}

initializeClient();

// Function to fetch user permissions from Hive
async function fetchUserPermissions(username: string) {
    try {
        console.log(`🔍 Fetching permissions for user: ${username}`);
        const response = await axios.get(
            `https://hive.datasektionen.se/api/v1/user/${username}/permissions`,
            {
                headers: {
                    "Authorization": `Bearer ${HIVE_API_KEY}`
                }
            }
        );
        console.log("✅ User permissions fetched from Hive");
        return response.data;
    } catch (error: any) {
        console.error("❌ Error fetching user permissions:", {
            status: error.response?.status,
            statusText: error.response?.statusText,
            message: error.message,
            data: error.response?.data
        });
        // Return empty array but add error information
        return { error: true, message: "Failed to fetch permissions" };
    }
}

// Function to fetch user memberships (mandates) from Hive
async function fetchUserMemberships(username: string) {
    try {
        console.log(`🔍 Fetching mandates for user: ${username}`);
        
        if (!HIVE_API_KEY) {
            console.error("❌ HIVE_API_KEY is undefined");
            return { error: true, message: "API key not configured" };
        }
        
        console.log(`🔑 Using API key with Bearer authentication`);
        
        const response = await axios.get(
            `https://hive.datasektionen.se/api/v1/tagged/link-manager/memberships/${username}`,
            {
                headers: {
                    "Authorization": `Bearer ${HIVE_API_KEY}`
                }
            }
        );
        console.log("✅ User mandates fetched from Hive");
        return response.data;
    } catch (error: any) {
        console.error("❌ Error fetching user mandates:", {
            status: error.response?.status,
            statusText: error.response?.statusText,
            message: error.message,
            data: error.response?.data
        });
        // Return empty array but add error information
        return { error: true, message: "Failed to fetch mandates" };
    }
}

// Export these functions so they can be imported elsewhere
export { fetchUserPermissions, fetchUserMemberships };

/**
 * Function to verify the code received from the OIDC provider.
 * The code is exchanged for an access token, user info is fetched, and a JWT is sent in the response.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @returns {Promise<void>} - A promise that resolves when the code is verified and the response is sent.
 */
// Tar koden vi får från sso och verifierar den, skickar tillbaka en jwt token till frontend
// och hämtar permissions och mandates från hive
export async function verifyCode(req: Request, res: Response): Promise<void> {
    try {
        // Check if the OIDC client is initialized
        if (!client) {
            console.error('❌ OIDC client not initialized 🔒');
            res.status(500).json({ error: 'OIDC client not initialized' });
            return;
        }

        // Extract the auth code from the request body
        const { code } = req.body;

        // Verify the code and send the access token in the response
        const tokenSet = await client.callback(`${CLIENT_URL}/auth/oidc-callback`, { code });
        
        // Add a non-null assertion operator to accessToken
        const accessToken = tokenSet.access_token!;

        // Fetch user info
        const userInfo = await client.userinfo(accessToken);
        
        // Extract username from userInfo and ensure it's a string
        const usernameRaw = userInfo.sub || userInfo.username || userInfo.user;
        const username = typeof usernameRaw === 'string' ? usernameRaw : String(usernameRaw);
        
        // Fetch permissions and mandates if username is available
        let permissions = [];
        let mandates = [];
        
        if (username) {
            permissions = await fetchUserPermissions(username);
            mandates = await fetchUserMemberships(username);
        }

        // Create a JWT with user info, permissions, and mandates
        const token = jwt.sign({ 
            ...userInfo,
            permissions: permissions,
            mandates: mandates
        }, JWT_SECRET!, { expiresIn: '1h' });

        // Return both token and decoded data separately
        res.status(200).json({ 
            token: token,
            userData: userInfo,
            userPermissions: permissions,
            userMandates: mandates
        });
    } catch (err: any) {
        console.error('❌ Error verifying code 🔒', err);
        res.status(500).json({ error: 'Error verifying code' });
    }
}

/**
 * Gets user data by decoding the JWT token on the server side
 * The frontend will call this instead of decoding the token itself
 */
export async function getUserData(req: Request, res: Response): Promise<void> {
    try {
      // The JWT middleware already verified the token and added user to req
      if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
  
      // Return extracted data from the token
      res.status(200).json({
        userData: {
          sub: req.user.sub,
          email: req.user.email,
          name: req.user.name,
          // Add other fields you need
        },
        userPermissions: req.user.permissions || [],
        userMandates: req.user.mandates || []
      });
    } catch (err) {
      console.error('Error getting user data:', err);
      res.status(500).json({ message: 'Server error' });
    }
}
