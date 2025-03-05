const VALID_API_KEYS = new Set([process.env.API_KEY]); // Expand if storing in DB

/**
 * Middleware to authenticate requests using an API key.
 * 
 * Validates the API key from the "Authorization" header (format: "Bearer <API_KEY>").
 * Returns 401 Unauthorized if missing or invalid, otherwise proceeds to next handler.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * 
 * @remarks
 * The function types for `req`, `res`, and `next` are set to `any` to avoid type errors.
 */
export const apiKeyAuth = (req: any, res: any, next: any) => {
    // Extract the API key from the "Authorization" header
    const apiKey = req.header("Authorization")?.split("Bearer ")[1];

    // Check if the API key is valid
    if (!apiKey || !VALID_API_KEYS.has(apiKey)) {
        // Send a 401 Unauthorized response if the API key is missing or invalid
        return res.status(401).send("Unauthorized");
    }

    // Proceed to the next middleware or route handler
    next();
};
