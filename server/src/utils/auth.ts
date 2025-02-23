const VALID_API_KEYS = new Set([process.env.API_KEY]); // Expand if storing in DB

/**
 * Middleware function to authenticate requests using an API key.
 *
 * This function checks for the presence of an API key in the "Authorization" header of the request.
 * The API key should be provided in the format "Bearer <API_KEY>".
 * If the API key is missing or invalid, a 401 Unauthorized response is sent.
 * Otherwise, the request is allowed to proceed to the next middleware or route handler.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next middleware function.
 */
export const apiKeyAuth = (req: any, res: any, next: any) => {
    // Extract the API key from the "Authorization" header
    const apiKey = req.header("Authorization")?.split("Bearer ")[1];

    // Check if the API key is valid
    if (!apiKey || !VALID_API_KEYS.has(apiKey)) {
        // Send a 401 Unauthorized response if the API key is missing or invalid
        return res.status(401).json({ error: "Unauthorized" });
    }

    // Proceed to the next middleware or route handler
    next();
};
