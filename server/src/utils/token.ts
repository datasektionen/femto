import axios from "axios";
import { Request, Response } from "express";

export async function checkToken(req: Request, res: Response): Promise<void> {

    const { token } = req.body;
    if (!token) { res.status(400).json({ error: "Token is required" }); return; }

    try {
        // Make request to Datasektionen's API from your backend
        const response = await axios.get("https://login.datasektionen.se/api/check-token", {
            headers: { Authorization: `Bearer ${token}` }
        });

        // Send the validated user data to the frontend
        res.json(response.data);
    } catch (error) {
        res.status(401).json({ error: "Invalid token" });
    }

}