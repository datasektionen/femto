import { raw, Request, Response } from "express";
import pool from "../db";

interface PermissionObject {
  id: string;
  scope: string | null;
}

/**
 * Generates a short link, either using a provided slug or generating a new one.
 *
 * @param {any} req - Express request object.
 * @param {any} res - Express response object.
 * @returns {Promise<void>} - A promise that resolves when the link is generated and the response is sent.
 */
export async function insertLink(req: Request, res: Response): Promise<void> {
  const { slug, url, user_id, description, mandate, expires } = req.body;

  const userId = req.user?.sub;
  
  // Simplified permission handling to handle strings
  const userPermissions = Array.isArray(req.user?.permissions) 
    ? req.user.permissions.map((perm: string | { id: string }) => 
        typeof perm === 'string' ? perm : (perm as { id: string }).id
      ) 
    : [];
  
  const userMandates = req.user?.mandates || [];

  console.log(`🔍 Processing link creation for user: ${userId || "unknown"}`);

  if (!userId) {
    console.error("❌ User ID not found in token");
    res.status(400).json({ error: "User ID not found in token" });
    return;
  }
  
  if (userId !== user_id) {
    console.error("❌ User ID mismatch");
    res.status(403).json({ error: "User ID mismatch" });
    return;
  }

  // Custom slug permission check
  if (slug) {
    const hasCustomSlugPermission = userPermissions.includes('custom-links');
    
    if (!hasCustomSlugPermission) {
      console.error("❌ User doesn't have permission to create custom slugs");
      res.status(403).json({ error: "You don't have permission to create custom slugs" });
      return;
    }
  }

  // Mandate/group permission check
  if (mandate) {
    const userGroups = userMandates.map(m => m.group_name);
    const belongsToGroup = userGroups.includes(mandate);
    
    if (!belongsToGroup) {
      console.error(`❌ User doesn't belong to the group: ${mandate}`);
      res.status(403).json({ error: `You don't belong to the group: ${mandate}` });
      return;
    }
  }

  // Rest of the original function remains the same...
  //Generates a base62 slug from a given number.
  function generateBase62(id: number) {
    // Characters used for base62 encoding
    const characters =
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const base = characters.length;
    let slug = "";

    // Convert the ID to a base62 string
    while (id > 0) {
      slug = characters[id % base] + slug;
      id = Math.floor(id / base);
    }

    return slug;
  }

  // Checks if a slug is already in the database.
  async function checkSlug(slug: string) {
    let client;
    try {
      client = await pool.connect();
      const result = await client.query("SELECT * FROM urls WHERE slug = $1", [
        slug,
      ]);
      return result.rows.length > 0;
    } catch (err: any) {
      console.error("❌ Error checking slug 📁", err.stack);
      return false;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  if (slug) {
    // If a slug is provided, check if it's already taken
    const slugAlreadyTaken = await checkSlug(slug);

    if (slugAlreadyTaken) {
      // If the slug is taken, return a 409 Conflict response
      res.status(409).send("Slug has already been taken");
      return;
    }

    let client;
    try {
      client = await pool.connect();
      // Insert the new link with the provided slug
      const result = await client.query(
        "INSERT INTO urls (slug, url, user_id, description, mandate, expires) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [slug, url, user_id, description, mandate, expires]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      console.error("❌ Error inserting link 📁", err.stack);
      res.status(500).send("Internal Server Error");
    } finally {
      if (client) {
        client.release();
      }
    }
  } else {
    // If no slug is provided, generate a new one
    let client;
    try {
      client = await pool.connect();

      // Insert the new link without a slug, and retrieve the generated ID
      const idResult = await client.query(
        "INSERT INTO urls (url, user_id, description, mandate, expires) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [url, user_id, description, mandate, expires]
      );
      const id = idResult.rows[0].id;
      // Generate a base62 slug from the ID
      const slug = generateBase62(id);

      // Update the link with the generated slug
      await client.query("UPDATE urls SET slug = $1 WHERE id = $2", [slug, id]);

      // Retrieve the newly created link
      const result = await client.query("SELECT * FROM urls WHERE id = $1", [
        id,
      ]);
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      console.error("❌ Error executing query 📁", err.stack);
      res.status(500).send("Internal Server Error");
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}

/**
 * GET /api/links
 * Returnerar alla länkar i tabellen 'urls'.
 * Om du vill skydda den här vägen kan du lägga
 * till t.ex. requireRole('admin')-middleware.
 */
export async function getAllLinks(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.sub;
    
    // Simplified permission handling to handle strings
    const userPermissions = Array.isArray(req.user?.permissions) 
      ? req.user.permissions.map(perm => 
          typeof perm === 'string' ? perm : (perm as { id: string }).id
        ) 
      : [];
    
    const userMandates = req.user?.mandates || [];
    
    console.log(`🔍 Fetching links for user: ${userId || "unknown"}`);

    if (!userId) {
      console.error("❌ User ID not found in token");
      res.status(400).json({ error: "User ID not found in token" });
      return;
    }

    // Check if user has manage-all permission
    const canManageAllLinks = userPermissions.includes('manage-all');

    let query;
    let queryParams: any[] = [];

    if (canManageAllLinks) {
      // If user can manage all links, don't filter
      console.log("🔑 User has manage-all permission - fetching all links");
      query = `SELECT * FROM urls ORDER BY expires DESC NULLS LAST`;
    } else {
      // Extract user's mandate groups
      const userGroups = userMandates.map(mandate => mandate.group_name);
      
      if (userGroups.length > 0) {
        // Return links created by the user OR connected to a group they belong to
        query = `
          SELECT * FROM urls 
          WHERE user_id = $1 
          OR mandate = ANY($2::text[])
          ORDER BY expires DESC NULLS LAST
        `;
        queryParams = [userId, userGroups];
      } else {
        // Return only links created by the user if they have no groups
        query = `
          SELECT * FROM urls 
          WHERE user_id = $1
          ORDER BY expires DESC NULLS LAST
        `;
        queryParams = [userId];
      }
    }

    console.log("Executing query:", query);
    console.log("With parameters:", queryParams);

    const result = await pool.query(query, queryParams);
    const links = result.rows;

    console.log(`✅ Found ${links.length} links for user ${userId}`);
    res.status(200).json(links);
  } catch (error) {
    console.error("❌ Error getting links:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Retrieves a single link from the database based on the provided slug.
 *
 * @param {any} req - Express request object.
 * @param {any} res - Express response object.
 * @returns {Promise<void>} - A promise that resolves when the link is retrieved and the response is sent.
 */
export async function getLink(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  let client;
  try {
    // Connect to the database
    client = await pool.connect();

    // Execute the query to retrieve the link with the specified slug
    const result = await client.query("SELECT * FROM urls WHERE slug = $1", [
      slug,
    ]);

    // Check if the link was found
    if (result.rows.length === 0) {
      // Send a 404 status code if the link was not found
      res.status(404).send("Link not found");
    } else {
      // Send the retrieved link as a JSON response
      res.status(200).json(result.rows[0]);
    }
  } catch (err: any) {
    // Log the error and send a 500 status code if an error occurs
    console.error("❌ Error getting link 📁", err.stack);
    res.status(500).send("Internal Server Error");
  } finally {
    // Release the client back to the pool
    if (client) {
      client.release();
    }
  }
}

/**
 * GET /api/links/:slug/stats
 * Param: ?granularity=hour|day (valfritt, default "day")
 * Returnerar klick-data ENDAST för de tidpunkter där det faktiskt finns klick.
 */
export async function getLinkStats(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  const { granularity = "day" } = req.query; // t.ex. ?granularity=hour
  let client;

  try {
    client = await pool.connect();

    // 1. Verifiera att länken finns
    const linkResult = await client.query(
      "SELECT id FROM urls WHERE slug = $1",
      [slug]
    );
    if (linkResult.rows.length === 0) {
      res.status(404).json({ error: "Link not found" });
      return;
    }
    const urlId = linkResult.rows[0].id;

    // 2. Tillåt endast "hour" eller "day"
    const validIntervals = ["hour", "day"];
    const interval = validIntervals.includes(granularity as string)
      ? granularity
      : "day";

    // 3. Gruppar klickdata per timme eller dag
    const statsResult = await client.query(
      `
        SELECT
          date_trunc('${interval}', clicked_at) AS date,
          COUNT(*) AS clicks
        FROM url_clicks
        WHERE url_id = $1
        GROUP BY 1
        ORDER BY 1
      `,
      [urlId]
    );

    // 4. Mappa resultatet till { date, clicks }
    const data = statsResult.rows.map((row: any) => ({
      date: row.date.toISOString(), // ex: "2025-01-01T09:00:00.000Z"
      clicks: Number(row.clicks),
    }));

    res.json(data);
  } catch (err: any) {
    console.error("❌ Error retrieving link stats 📁", err.stack);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function getLangstats(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  let client;

  try {
    client = await pool.connect();

    // 1. Verifiera att länken finns
    const linkResult = await client.query(
      "SELECT id FROM urls WHERE slug = $1",
      [slug]
    );
    if (linkResult.rows.length === 0) {
      res.status(404).json({ error: "Link not found" });
      return;
    }
    const urlId = linkResult.rows[0].id;

    // 2. Hämta språkstatistik
    const langRes = await client.query(
      `SELECT language, COUNT(*) AS clicks
            FROM url_clicks
            WHERE url_id = $1
            GROUP BY language
            ORDER BY clicks DESC`,
      [urlId]
    );

    res.json(
      langRes.rows.map((r: any) => ({
        language: r.language,
        clicks: Number(r.clicks),
      }))
    );
  } catch (err: any) {
    console.error("❌ Error retrieving language stats 📁:", err);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client?.release();
  }
}
