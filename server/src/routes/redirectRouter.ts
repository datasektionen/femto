import { Router } from "express";
import type { Request, Response } from "express";
import pool from "../services/db";
import { checkExpiredLink } from "../services/cleanupService";

const redirectRouter = Router();

// Lista över kända botar
// Denna lista kan utökas med fler botar vid behov
const knownBots = [
    "bot",
    "crawler",
    "spider",
    "discord",
    "slack",
    "google",
    "bing",
    "yahoo",
    "facebook",
    "twitter",
    "embed",
];

// Funktion för att kontrollera om en begäran kommer från en bot
// Om User-Agent inte finns, antas det vara en bot
function isBotRequest(userAgent: string | undefined): boolean {
    if (!userAgent) return true; // Ingen User-Agent, antas vara en bot
    const lowerUserAgent = userAgent.toLowerCase();
    return knownBots.some((bot) => lowerUserAgent.includes(bot));
}

// Rot-omdirigering till datasektionen.se
redirectRouter.get("/", (req, res) => {
    res.status(301).location("https://datasektionen.se").end();
});

// GET /:slug => Hämta länk, logga klick och omdirigera
redirectRouter.get("/:slug", async (req: any, res: any) => {
    // Använd any för att undvika typfel, kan förbättras senare (detta är korkat eftersom vi har en typ för req och res i express)

    const slug = req.params.slug.toLowerCase(); // Gör slug till gemener för att säkerställa att det är case-insensitive
    const userAgent = req.get("User-Agent");
    const acceptLanguage = req.get("Accept-Language") || "en-US,en;q=0.9";

    await checkExpiredLink(slug); // Kontrollera om länken är utgången

    // Kontrollera om request är från en bot
    const isBot = isBotRequest(userAgent);

    let client;
    try {
        client = await pool.connect();
        // Hämta URL och dess ID baserat på slug
        const result = await client.query(
            "SELECT id, url FROM urls WHERE slug = $1",
            [slug]
        );

        if (result.rows.length > 0) {
            const urlId = result.rows[0].id;
            const redirectUrl = result.rows[0].url;
            const language = acceptLanguage.split(",")[0]; // Hämta det första språket i Accept-Language-headern

            if (!isBot) {
                // Logga klicket i url_clicks-tabellen endast om det inte är en bot
                await client.query("INSERT INTO url_clicks (url_id, language) VALUES ($1, $2)", [
                    urlId,
                    language,
                ]);
            }

            // Omdirigera
            res.status(302).location(redirectUrl).end();
        } else {
            res.status(404).send("Slug not found");
        }
    } catch (err: any) {
        console.error(`[Redirect] ❌ Error executing query 📁`, err.stack);
        res.status(500).send("Internal Server Error");
    } finally {
        if (client) {
            client.release();
        }
    }
});

export default redirectRouter;
