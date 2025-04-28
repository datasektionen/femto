import { Router } from "express";
import type { Request, Response } from "express";
import pool from "../db";

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
  const slug = req.params.slug;
  const userAgent = req.get("User-Agent");

  // Kontrollera om request är från en bot
  const isBot = isBotRequest(userAgent);
  if (isBot) {
    console.log(`🤖 Bot detected: ${userAgent}`);
  }

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

      if (!isBot) {
        // Logga klicket i url_clicks-tabellen endast om det inte är en bot
        console.log(`✅ Logging click for URL ID: ${urlId} 📁`);
        await client.query("INSERT INTO url_clicks (url_id) VALUES ($1)", [
          urlId,
        ]);
      }

      // Omdirigera
      res.status(302).location(redirectUrl).end();
    } else {
      res.status(404).send("Slug not found");
    }
  } catch (err: any) {
    console.error("❌ Error executing query 📁", err.stack);
    res.status(500).send("Internal Server Error");
  } finally {
    if (client) {
      client.release();
    }
  }
});

export default redirectRouter;
