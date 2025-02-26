import crypto from "crypto";

/**
 * Generates a cryptographically secure random API key
 * - Uses 32 bytes of random data (256 bits)
 * - Encodes as a hexadecimal string (64 characters)
 */
const apiKey = crypto.randomBytes(32).toString("hex");
console.log("Generated API Key:", apiKey);
