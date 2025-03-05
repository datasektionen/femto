import { Request, Response } from 'express';
import { Issuer, Client } from 'openid-client';

//❗️openid-client version <= 5.0.0 is required for this code to work❗️

// Load environment variables
const OIDC_ISSUER = process.env.OIDC_ISSUER || 'https://sso.datasektionen.se';
const CLIENT_ID = process.env.CLIENT_ID || 'client-id';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'client-secret';
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/auth/oidc-callback';

// Declare mutable variable client, initialized as null
let client: Client | null = null;

// Initialize the OpenID client
async function initializeClient() {
    try {
        const issuer = await Issuer.discover(`${OIDC_ISSUER}/op/`);
        client = new issuer.Client({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uris: [REDIRECT_URI],
            response_types: ['code'],
        });
        console.log('✅ OIDC client initialized 🔒');
    } catch (err: any) {
        console.error('❌ Error initializing OIDC client 🔒', err);
    }
}

initializeClient();

/**
 * Function to verify the code received from the OIDC provider.
 * The code is exchanged for an access token which is sent in the response.
 * 
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @returns {Promise<void>} - A promise that resolves when the code is verified and the response is sent.
 */
export async function verifyCode(req: Request, res: Response): Promise<void> {
    // Check if the OIDC client is initialized
    if (!client) {
        console.error('❌ OIDC client not initialized 🔒');
        res.status(500).json({ error: 'OIDC client not initialized' });
        return;
    }

    // Extract the auth code from the request body
    const { code } = req.body;

    // Verify the code and send the access token in the response
    try {
        const tokenSet = await client.callback(REDIRECT_URI, { code });
        res.status(200).json(tokenSet);
    } catch (err: any) {
        console.error('❌ Error verifying code 🔒', err);
        res.status(500).json({ error: 'Error verifying code' });
    }
}
