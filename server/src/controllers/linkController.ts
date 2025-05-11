import { raw, Request, Response } from "express";
import pool from "../db";
import { isBlacklistedDB } from "./blacklistController";

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
  const {
    slug,
    url,
    user_id,
    description,
    group,
    group_domain,
    expires: expiresString,
  } = req.body;

  let expiresForDb: Date | null = null;
  if (expiresString) {
    // Parse the ISO string correctly to ensure UTC handling
    expiresForDb = new Date(expiresString);
    console.log(`Received expires string: ${expiresString}`);
    console.log(`Parsed UTC time: ${expiresForDb.toISOString()}`);
  }

  const userId = req.user?.sub;

  // Simplified permission handling to handle strings
  const userPermissions = Array.isArray(req.user?.permissions)
    ? req.user.permissions.map((perm: string | { id: string }) =>
        typeof perm === "string" ? perm : (perm as { id: string }).id
      )
    : [];

  const userGroups = req.user?.groups || [];

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

  if (await isBlacklistedDB(url)) {
    console.error("❌ Denna URL är blacklistad");
    res.status(403).json({ error: "Denna URL är blacklistad" });
    return;
  }

  // Custom slug permission check
  if (slug) {
    const hasCustomSlugPermission = userPermissions.includes("custom-links");

    if (!hasCustomSlugPermission) {
      console.error("❌ User doesn't have permission to create custom slugs");
      res
        .status(403)
        .json({ error: "You don't have permission to create custom slugs" });
      return;
    }
  }

  // Mandate/group permission check
  if (group) {
    const user_GroupsWithDomain = userGroups.map(
      (m) => `${m.group_name}@${m.group_domain}`
    );

    // Format the combined group identifier
    const groupWithDomain = `${group}@${group_domain}`;

    // Check if user has access to this group
    const belongsToGroup = user_GroupsWithDomain.includes(groupWithDomain);

    if (!belongsToGroup) {
      console.error(`❌ User doesn't belong to the group: ${groupWithDomain}`);
      res
        .status(403)
        .json({ error: `You don't belong to the group: ${group}` });
      return;
    }
  }

  //Generates a slug from a given number.
  function base64UrlEncode(id: number): string {
    return Buffer.from(id.toString())
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
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
      res.status(409).send("Denna slug är redan upptagen.");
      return;
    }

    let client;
    try {
      client = await pool.connect();
      // Insert the new link with the provided slug
      const groupIdentifier = `${group}@${group_domain}`;
      const query = `INSERT INTO urls (slug, url, user_id, description, group_name, expires) 
               VALUES ($1, $2, $3, $4, $5, $6::timestamptz) RETURNING *`;
      const result = await client.query(query, [
        slug,
        url,
        user_id,
        description,
        groupIdentifier,
        expiresForDb?.toISOString(),
      ]);
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

      const groupIdentifier = `${group}@${group_domain}`;

      // Insert the new link without a slug, and retrieve the generated ID
      const idResult = await client.query(
        "INSERT INTO urls (url, user_id, description, group_name, expires) VALUES ($1, $2, $3, $4, $5::timestamptz) RETURNING id",
        [
          url,
          user_id,
          description,
          groupIdentifier,
          expiresForDb?.toISOString(),
        ] // FIX: Convert to ISO string
      );
      const id = idResult.rows[0].id;
      // Generate a a Slug from the ID
      const slug = base64UrlEncode(id);

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
 * Deletes a link from the database based on the provided slug.
 *
 * @param {any} req - Express request object.
 * @param {any} res - Express response object.
 * @returns {Promise<void>} - A promise that resolves when the link is deleted and the response is sent.
 */
export async function deleteLink(req: Request, res: Response): Promise<void> {
  // Extract the slug from the request parameters
  const { slug } = req.params;

  // Extract user ID from the request object (provided by middleware)
  const userId = req.user?.sub;

  // Simplified permission handling to handle strings
  const userPermissions = Array.isArray(req.user?.permissions)
    ? req.user.permissions.map((perm: string | { id: string }) =>
        typeof perm === "string" ? perm : (perm as { id: string }).id
      )
    : [];

  // Extract user groups from the request object (provided by middleware)
  const userGroups = req.user?.groups || [];
  const userGroupNames = userGroups.map((m) => m.group_name); // Get just the group names

  if (!userId) {
    console.error("❌ User ID not found in token for deletion attempt");
    res.status(400).json({ error: "User ID not found in token" });
    return;
  }

  let client;
  try {
    client = await pool.connect();

    if (userPermissions.includes("manage-all")) {
      // If the user has the "manage-all" permission, allow deletion without ownership checks
      console.log(
        `🔑 User ${userId} has manage-all permission - deleting link ${slug} without checks`
      );
      const deleteResult = await client.query(
        "DELETE FROM urls WHERE slug = $1 RETURNING slug",
        [slug]
      );

      if (deleteResult.rowCount === 0) {
        res.status(404).send("Link not found");
      } else {
        res.status(204).send();
      }
    } else {
      // If the user doesn't have "manage-all", check ownership or mandate membership
      console.log(
        `ℹ️ User ${userId} attempting to delete link ${slug} - checking ownership/mandate`
      );

      // Fetch the link's owner and mandate
      const linkResult = await client.query(
        "SELECT user_id, group_name FROM urls WHERE slug = $1",
        [slug]
      );

      if (linkResult.rows.length === 0) {
        res.status(404).send("Link not found");
        return; // Exit early if link doesn't exist
      }

      const linkOwnerId = linkResult.rows[0].user_id;
      const linkGroup = linkResult.rows[0].group_name;

      // Check if the user owns the link OR if the link has a group and the user belongs to that group
      const isOwner = linkOwnerId === userId;
      const hasGroupAccess = linkGroup && userGroupNames.includes(linkGroup);

      if (isOwner || hasGroupAccess) {
        console.log(
          `✅ User ${userId} has permission to delete link ${slug} (Owner: ${isOwner}, Group Access: ${hasGroupAccess})`
        );
        await client.query("DELETE FROM urls WHERE slug = $1", [slug]);
        res.status(204).send();
      } else {
        console.warn(
          `🚫 User ${userId} denied deletion of link ${slug} - Not owner or matching group`
        );
        res
          .status(403)
          .send("Forbidden: You do not have permission to delete this link.");
      }
    }
  } catch (err: any) {
    console.error(`❌ Error deleting link ${slug} 📁`, err.stack);
    res.status(500).send("Internal Server Error");
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Updates a link in the database based on the provided slug and request body.
 *
 * @param {any} req - Express request object.
 * @param {any} res - Express response object.
 * @returns {Promise<void>} - A promise that resolves when the link is updated and the response is sent.
 */
export async function updateLink(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  const { url, description, group, group_domain, expires } = req.body;
  const userId = req.user?.sub;

  // Simplified permission handling
  const userPermissions = Array.isArray(req.user?.permissions)
    ? req.user.permissions.map((perm: string | { id: string }) =>
        typeof perm === "string" ? perm : (perm as { id: string }).id
      )
    : [];

  // Extract user mandates and group names
  const userGroups = req.user?.groups || [];
  const userGroupNames = userGroups.map((m) => m.group_name);

  if (!userId) {
    console.error("❌ User ID not found in token for update attempt");
    res.status(400).json({ error: "User ID not found in token" });
    return;
  }

  // Basic validation: At least one field must be provided for update
  if (
    url === undefined &&
    description === undefined &&
    group === undefined &&
    expires === undefined
  ) {
    res.status(400).json({ error: "No update fields provided" });
    return;
  }

  if (await isBlacklistedDB(url)) {
    console.error("❌ URL is blacklisted");
    res.status(403).json({ error: "Denna URL är blacklistad" });
    return;
  }

  let client;
  try {
    client = await pool.connect();

    // Build the SET part of the SQL query dynamically
    const setClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (url !== undefined) {
      setClauses.push(`url = $${paramIndex++}`);
      queryParams.push(url);
    }
    if (description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      queryParams.push(description);
    }
    if (group !== undefined) {
      // Check if user belongs to the new mandate group if they don't have manage-all
      if (!userPermissions.includes("manage-all") && group !== null) {
        const user_GroupsWithDomain = userGroups.map(
          (m) => `${m.group_name}@${m.group_domain}`
        );

        // Format the combined group identifier
        const groupWithDomain = `${group}@${group_domain}`;

        // Check if user has access to this group
        const belongsToGroup = user_GroupsWithDomain.includes(groupWithDomain);

        if (!belongsToGroup) {
          console.warn(
            `🚫 User ${userId} tried to assign link ${slug} to group ${groupWithDomain} they don't belong to.`
          );
          res
            .status(403)
            .send(`Forbidden: You do not belong to the group '${group}'.`);
          return;
        }
      }
      const groupIdentifier = `${group}@${group_domain}`;
      setClauses.push(`group_name = $${paramIndex++}`);
      queryParams.push(groupIdentifier); // Allow setting group to null
    }
    if (expires !== undefined) {
      setClauses.push(`expires = $${paramIndex++}`);
      queryParams.push(expires); // Allow setting expires to null
    }

    // Add slug to query parameters for the WHERE clause
    queryParams.push(slug);
    const slugParamIndex = paramIndex;

    const setClauseString = setClauses.join(", ");

    if (userPermissions.includes("manage-all")) {
      // User has manage-all permission, update directly
      console.log(
        `🔑 User ${userId} has manage-all permission - updating link ${slug}`
      );
      const updateQuery = `UPDATE urls SET ${setClauseString} WHERE slug = $${slugParamIndex} RETURNING *`;
      const updateResult = await client.query(updateQuery, queryParams);

      if (updateResult.rowCount === 0) {
        res.status(404).send("Link not found");
      } else {
        res.status(200).json(updateResult.rows[0]);
      }
    } else {
      // User does not have manage-all, check ownership or mandate
      console.log(
        `ℹ️ User ${userId} attempting to update link ${slug} - checking ownership/mandate`
      );

      // Fetch the link's owner and group first
      const linkResult = await client.query(
        "SELECT user_id, group_name FROM urls WHERE slug = $1",
        [slug]
      );

      if (linkResult.rows.length === 0) {
        res.status(404).send("Link not found");
        return;
      }

      const linkOwnerId = linkResult.rows[0].user_id;
      const linkGroup = linkResult.rows[0].group_name;

      const isOwner = linkOwnerId === userId;
      const linkGroupName = linkGroup ? linkGroup.split('@')[0] : null;
      const hasGroupAccess = linkGroup && userGroupNames.includes(linkGroupName);

      if (isOwner || hasGroupAccess) {
        // Updated condition
        console.log(
          `✅ User ${userId} has permission to update link ${slug} (Owner: ${isOwner}, Group Access: ${hasGroupAccess})`
        ); // Updated log message
        // Add user_id or group check to the WHERE clause for safety
        // This ensures they can only update links they own or manage via group
        const updateQuery = `
                    UPDATE urls
                    SET ${setClauseString}
                    WHERE slug = $${slugParamIndex} AND (user_id = $${
          slugParamIndex + 1
        } OR group_name = ANY($${slugParamIndex + 2}::text[]))
                    RETURNING *`;

        // Add userId and userGroupNames to the parameters for the WHERE clause check
        const finalQueryParams = [...queryParams, userId, userGroupNames];

        const updateResult = await client.query(updateQuery, finalQueryParams);

        if (updateResult.rowCount === 0) {
          // This might happen if the link exists but doesn't match the final WHERE clause (should theoretically not happen due to prior checks, but good for safety)
          console.warn(
            `🚫 Update for link ${slug} by user ${userId} failed unexpectedly after permission check.`
          );
          res
            .status(404)
            .send("Link not found or permission mismatch during update.");
        } else {
          res.status(200).json(updateResult.rows[0]);
        }
      } else {
        console.warn(
          `🚫 User ${userId} denied update of link ${slug} - Not owner or matching mandate`
        );
        res
          .status(403)
          .send("Forbidden: You do not have permission to update this link.");
      }
    }
  } catch (err: any) {
    console.error(`❌ Error updating link ${slug} 📁`, err.stack);
    // Handle potential unique constraint violation if changing URL/description makes it non-unique if needed
    if (err.code === "23505") {
      // Unique violation error code in PostgreSQL
      res
        .status(409)
        .json({
          error:
            "Update failed due to conflicting data (e.g., unique constraint).",
        });
    } else {
      res.status(500).send("Internal Server Error");
    }
  } finally {
    if (client) {
      client.release();
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
      ? req.user.permissions.map((perm) =>
          typeof perm === "string" ? perm : (perm as { id: string }).id
        )
      : [];

    const userGroups = req.user?.groups || [];

    console.log(`🔍 Fetching links for user: ${userId || "unknown"}`);

    if (!userId) {
      console.error("❌ User ID not found in token");
      res.status(400).json({ error: "User ID not found in token" });
      return;
    }

    // Check if user has manage-all permission
    const canManageAllLinks = userPermissions.includes("manage-all");

    let query;
    let queryParams: any[] = [];

    if (canManageAllLinks) {
      // If user can manage all links, don't filter
      console.log("🔑 User has manage-all permission - fetching all links");
      query = `SELECT * FROM urls ORDER BY expires DESC NULLS LAST`;
    } else {
      // Extract user's group names
      const userGroupNames = userGroups.map((group) => group.group_name);

      if (userGroupNames.length > 0) {
        // Return links created by the user OR connected to a group they belong to
        query = `
          SELECT * FROM urls 
          WHERE user_id = $1 
          OR group_name = ANY($2::text[])
          ORDER BY expires DESC NULLS LAST
        `;
        queryParams = [userId, userGroupNames];
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

    // Format timestamps for each link before sending
    const formatted = result.rows.map((link) => ({
      ...link,
      date: link.date.toISOString(), // still UTC
      expires: link.expires?.toISOString() || null,
    }));

    console.log(`✅ Found ${formatted.length} links for user ${userId}`);
    res.status(200).json(formatted);
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
    client = await pool.connect();
    const result = await client.query("SELECT * FROM urls WHERE slug = $1", [
      slug,
    ]);

    if (result.rows.length === 0) {
      res.status(404).send("Link not found");
    } else {
      const link = result.rows[0];

      const responseLink = {
        ...link,
        date: link.date.toISOString(),
        expires: link.expires?.toISOString() || null,
      };
      res.status(200).json(responseLink);
    }
  } catch (err: any) {
    console.error("❌ Error getting link 📁", err.stack);
    res.status(500).send("Internal Server Error");
  } finally {
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
