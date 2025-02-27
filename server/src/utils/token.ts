import axios from "axios";
import { Request, Response } from "express";

/**
 * Verifies a user's token by making a request to Datasektionen's API.
 * 
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @returns {Promise<void>} - A promise that resolves when the token is verified and the response is sent.
 */
export async function checkToken(req: Request, res: Response): Promise<void> {

    const { token } = req.body;
    if (!token) { res.status(400).json({ error: "Token is required" }); return; }

    try {
        // Make request to Datasektionen's API
        const response = await axios.get("https://sso.datasektionen.se/op-callback", {
            headers: { Authorization: `Bearer ${token}` }
        });

        // Send the validated user data to the frontend
        res.json(response.data);
    } catch (err: any) {
        console.error("❌ Error validating token 🔑", err.stack);
        res.status(401).json({ error: "Invalid token" });
    }

}