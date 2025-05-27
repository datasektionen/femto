import { raw, Request, Response } from "express";
import pool from "../services/db";
import { isBlacklisted } from "./blacklistController";

const slugRegex: RegExp = /^[a-z0-9-]+$/; // Regex to validate slugs (lowercase alphanumeric and hyphens)

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
        group_id, // CHANGED: from 'group' to 'group_id'
        actual_group_name, // NEW: the display name of the group
        group_domain,
        expires: expiresString,
    } = req.body;

    //check if url is empty or only contains protocol
    if (!url || /^https?:\/\/$/i.test(url.trim())) {
        console.warn(`[Link] ❌ URL is empty or only contains protocol`);
        res.status(400).json({ error: "URL cannot be empty or only contain protocol" });
        return;
    }

    let expiresForDb: Date | null = null;
    if (expiresString) {
        expiresForDb = new Date(expiresString);
        console.log(`[Link] ℹ️ Received expires string: ${expiresString}`);
        console.log(`[Link] ℹ️ Parsed UTC time: ${expiresForDb.toISOString()}`);
    }

    const userId = req.user?.sub;
    const userPermissions = Array.isArray(req.user?.permissions)
        ? req.user.permissions.map((perm: string | { id: string }) =>
            typeof perm === "string" ? perm : (perm as { id: string }).id
        )
        : [];
    const userGroups = req.user?.groups || []; // Expects userGroups to be [{ group_id, group_name, group_domain, ... }]

    if (!userId) {
        console.warn(`[Link] ❌ User ID not found in token`);
        res.status(400).json({ error: "User ID not found in token" });
        return;
    }

    if (userId !== user_id) {
        console.warn("[Link] ❌ User ID mismatch");
        res.status(403).json({ error: "User ID mismatch" });
        return;
    }

    if (await isBlacklisted(url)) {
        console.log(`[Link] ❌ The URL is blacklisted: ${url}`);
        res.status(403).json({ error: "Denna URL är blacklistad" });
        return;
    }

    // Custom slug permission check
    if (slug) {
        const hasCustomSlugPermission = userPermissions.includes("custom-links");
        if (!hasCustomSlugPermission) {
            console.warn(`[Link] ❌ User doesn't have permission to create custom slugs`);
            res.status(403).json({ error: "You don't have permission to create custom slugs" });
            return;
        }
        if (!slugRegex.test(slug)) {
            console.warn(`[Link] ❌ Invalid slug format`);
            res.status(400).json({ error: "Invalid slug format" });
            return;
        }
    }

    // Mandate/group permission check
    if (group_id && group_domain) { // Check if a group is being assigned
        const userGroupIdentifiers = userGroups.map(
            (g: any) => `${g.group_id}@${g.group_domain}` // Create id@domain from user's groups
        );

        const targetGroupIdentifier = `${group_id}@${group_domain}`;
        const groupForErrorMessage = actual_group_name || group_id; // Use display name for error if available

        // Check if user has access to this group_id@group_domain
        if (!userGroupIdentifiers.includes(targetGroupIdentifier)) {
            console.warn(`[Link] ❌ User ${userId} doesn't belong to the group: ${targetGroupIdentifier}`);
            res.status(403).json({ error: `You don't belong to the group: ${groupForErrorMessage}` });
            return;
        }
    }


    // Function to encode an ID to a slug, tested for uniqueness up to 1 million
    function encodeId(id: number): string {
        if (id < 0) throw new Error('ID must be non-negative');

        const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789'; // Avoid 'o'='0' and 'l'='1' to prevent confusion
        const base = alphabet.length;

        let slug = '';
        let current = id;

        do {
            slug = alphabet[current % base] + slug;
            current = Math.floor(current / base);
        } while (current > 0);

        return slug.padStart(4, alphabet[0]); // pad with 'a' to length 4
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
            console.error(`[Link] ❌ Error checking slug 📁`, err.stack);
            return false;
        } finally {
            if (client) {
                client.release();
            }
        }
    }

    // Prepare group data for storage
    const groupIdentifierForDb = group_id && group_domain ? `${group_id}@${group_domain}` : null;
    const displayGroupNameForDb = actual_group_name || null; // If actual_group_name is empty/null, this becomes null

    if (slug) {
        const slugAlreadyTaken = await checkSlug(slug);
        if (slugAlreadyTaken) {
            res.status(409).send("Denna slug är redan upptagen.");
            return;
        }

        let client;
        try {
            client = await pool.connect();
            const query = `INSERT INTO urls (slug, url, user_id, description, group_identifier, display_group_name, expires) 
                           VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz) RETURNING *`;
            const result = await client.query(query, [
                slug,
                url,
                user_id,
                description,
                groupIdentifierForDb,      // Storing group_id@group_domain
                displayGroupNameForDb,     // Storing actual_group_name
                expiresForDb?.toISOString(),
            ]);
            res.status(201).json(result.rows[0]);
        } catch (err: any) {
            console.error(`[Link] ❌ Error inserting link 📁`, err.stack);
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
            const idResult = await client.query(
                "INSERT INTO urls (url, user_id, description, group_identifier, display_group_name, expires) VALUES ($1, $2, $3, $4, $5, $6::timestamptz) RETURNING id",
                [
                    url,
                    user_id,
                    description,
                    groupIdentifierForDb,      // Storing group_id@group_domain
                    displayGroupNameForDb,     // Storing actual_group_name
                    expiresForDb?.toISOString(),
                ]
            );
            const newId = idResult.rows[0].id;
            const generatedSlug = encodeId(newId);

            await client.query("UPDATE urls SET slug = $1 WHERE id = $2", [generatedSlug, newId]);

            // Retrieve the newly created link
            const result = await client.query("SELECT * FROM urls WHERE id = $1", [
                newId,
            ]);
            res.status(201).json(result.rows[0]);
        } catch (err: any) {
            console.error(`[Link] ❌ Error executing query 📁`, err.stack);
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
        console.warn(`[Link] ❌ User ID not found in token for deletion attempt`);
        res.status(400).json({ error: "User ID not found in token" });
        return;
    }

    let client;
    try {
        client = await pool.connect();

        if (userPermissions.includes("manage-all")) {
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
            // Non-admin path:
            // Fetch the link's owner and group_identifier
            const linkResult = await client.query(
                "SELECT user_id, group_identifier FROM urls WHERE slug = $1", // CORRECTED: fetch group_identifier
                [slug]
            );

            if (linkResult.rows.length === 0) {
                res.status(404).send("Link not found");
                return; 
            }

            const linkOwnerId = linkResult.rows[0].user_id;
            const linkGroupIdentifier = linkResult.rows[0].group_identifier; // This is id@domain or null

            const isOwner = linkOwnerId === userId;

            // User's group identifiers (id@domain)
            const userGroupIdentifiersForDeletion = userGroups.map((g: any) => `${g.group_id}@${g.group_domain}`);
            
            // Check if user has access to the link's group (if it has one)
            const hasGroupAccess = !!linkGroupIdentifier && userGroupIdentifiersForDeletion.includes(linkGroupIdentifier);

            if (isOwner || hasGroupAccess) {
                // Construct WHERE clause for deletion to ensure they only delete what they are allowed to
                let deleteQuery = "DELETE FROM urls WHERE slug = $1 AND (user_id = $2";
                const queryParamsForDelete: any[] = [slug, userId];
                let currentParamIndexForDelete = 3;

                if (userGroupIdentifiersForDeletion.length > 0) {
                    deleteQuery += ` OR group_identifier = ANY($${currentParamIndexForDelete}::text[])`;
                    queryParamsForDelete.push(userGroupIdentifiersForDeletion);
                }
                deleteQuery += ") RETURNING slug"; // Add RETURNING to check if a row was actually deleted by this user

                const deleteResult = await client.query(deleteQuery, queryParamsForDelete);
                
                if (deleteResult.rowCount === 0) {
                    // This means the link existed (checked above) but this user didn't have permission to delete it with the refined WHERE.
                    console.warn(`[Link] 🚫 Delete for link ${slug} by user ${userId} failed permission check during final delete operation.`);
                    res.status(403).send("Forbidden: You do not have permission to delete this link (final check).");
                } else {
                    res.status(204).send();
                }
            } else {
                console.warn(`[Link] 🚫 User ${userId} denied deletion of link ${slug} - Not owner or no access to group ${linkGroupIdentifier}`);
                res.status(403).send("Forbidden: You do not have permission to delete this link.");
            }
        }
    } catch (err: any) {
        console.error(`[Link] ❌ Error deleting link ${slug} 📁`, err.stack);
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
    const { url, description, group_id, actual_group_name, group_domain, expires } = req.body;
    const userId = req.user?.sub;



    //check if url is empty or only contains protocol
    if (!url || /^https?:\/\/$/i.test(url.trim())) {
        console.warn(`[Link] ❌ URL is empty or only contains protocol`);
        res.status(400).json({ error: "URL cannot be empty or only contain protocol" });
        return;
    }

    // Simplified permission handling

    const userPermissions = Array.isArray(req.user?.permissions)
        ? req.user.permissions.map((perm: string | { id: string }) =>
            typeof perm === "string" ? perm : (perm as { id: string }).id
        )
        : [];
    const userGroups = req.user?.groups || []; // Expects [{ group_id, group_name, group_domain, ... }]

    if (!userId) {
        console.warn(`[Link] ❌ User ID not found in token for update attempt`);
        res.status(400).json({ error: "User ID not found in token" });
        return;
    }

    // Basic validation: At least one field must be provided for update
    if (
        url === undefined &&
        description === undefined &&
        group_id === undefined && // if group_id is undefined, actual_group_name and group_domain are also implicitly not being set for a *new* group
        actual_group_name === undefined && // if only actual_group_name is sent, it implies changing display name of existing group
        group_domain === undefined && // if only group_domain is sent, it implies changing domain of existing group (less common)
        expires === undefined
    ) {
        res.status(400).json({ error: "No update fields provided" });
        return;
    }

    if (url && await isBlacklisted(url)) { // Check url only if it's provided
        console.log(`[Link] ❌ URL is blacklisted: ${url}`);
        res.status(403).json({ error: "Denna URL är blacklistad" });
        return;
    }

    let client;
    try {
        client = await pool.connect();

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
        if (group_id !== undefined || actual_group_name !== undefined) { // A change related to group is intended
            if (group_id === null) { // Frontend signals to REMOVE group association
                setClauses.push(`group_identifier = $${paramIndex++}`);
                queryParams.push(null); // SQL NULL for group_identifier
                setClauses.push(`display_group_name = $${paramIndex++}`);
                queryParams.push(null); // SQL NULL for display_group_name
            } else if (group_id && group_domain) { // Assigning or changing to a NEW group
                const groupForErrorMessage = actual_group_name || group_id; // For user-facing errors
                const targetGroupIdentifier = `${group_id}@${group_domain}`; // The id@domain identifier we want to assign

                // Check if user belongs to the new mandate group if they don't have manage-all
                if (!userPermissions.includes("manage-all")) {
                    // Check 1: Is the target group (identified by group_id and group_domain) 
                    // one of the user's actual Hive groups?
                    const isGroupFromUserHive = userGroups.some(
                        (g: any) => g.group_id === group_id && g.group_domain === group_domain
                    );

                    if (!isGroupFromUserHive) {
                        console.warn(`[Link] 🚫 User ${userId} tried to assign link ${slug} to a group (${targetGroupIdentifier}) that is not part of their Hive memberships.`);
                        res.status(400).json({
                            error: `Gruppen '${groupForErrorMessage}' är inte en del av dina HIVE grupper.`,
                        });
                        return;
                    }
                    // If isGroupFromUserHive is true, it implies the user "belongs" to this targetGroupIdentifier,
                    // as userGroups comes from their authenticated session and contains their legitimate groups.
                }

                // If all permission checks pass, prepare for storage:
                const groupIdentifierForStorage = targetGroupIdentifier; // This is id@domain
                
                let groupDisplayNameForStorage = actual_group_name;
                // If frontend doesn't send actual_group_name with group_id,
                // try to find the display name from the user's authenticated groups.
                if (!groupDisplayNameForStorage) { 
                    const matchingUserGroup = userGroups.find((g:any) => g.group_id === group_id && g.group_domain === group_domain);
                    // Use the group_name from user's Hive groups as the display name
                    groupDisplayNameForStorage = matchingUserGroup ? matchingUserGroup.group_name : group_id; // Fallback to group_id if not found
                }

                setClauses.push(`group_identifier = $${paramIndex++}`);
                queryParams.push(groupIdentifierForStorage); // Stores group_id@group_domain
                setClauses.push(`display_group_name = $${paramIndex++}`);
                queryParams.push(groupDisplayNameForStorage); // Stores the actual group name

            } else if (actual_group_name !== undefined && group_id === undefined && group_domain === undefined) {
                // This case means only the display name is being updated for the *currently associated* group.
                // The group_identifier (id@domain) itself is not changing.
                // The general permission check later (isOwner or hasAccessToCurrentGroup) will cover this.
                setClauses.push(`display_group_name = $${paramIndex++}`);
                queryParams.push(actual_group_name);
            }
            // Note: The old lines that set `group_name` column using `${group}@${group_domain}` should be removed
            // as we are now setting `group_identifier` and `display_group_name`.
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

            const updateQuery = `UPDATE urls SET ${setClauseString} WHERE slug = $${slugParamIndex} RETURNING *`;
            const updateResult = await client.query(updateQuery, queryParams);

            if (updateResult.rowCount === 0) {
                res.status(404).send("Link not found");
            } else {
                res.status(200).json(updateResult.rows[0]);
            }
        } else {
            // Non-admin path:
            // Fetch the link's owner and current group_identifier
            const linkResult = await client.query(
                "SELECT user_id, group_identifier FROM urls WHERE slug = $1", // CORRECTED: fetch group_identifier
                [slug]
            );

            if (linkResult.rows.length === 0) {
                res.status(404).send("Link not found");
                return;
            }

            const linkOwnerId = linkResult.rows[0].user_id;
            const currentLinkGroupIdentifier = linkResult.rows[0].group_identifier; // This is id@domain or null

            const isOwner = linkOwnerId === userId;
            
            // User's group identifiers (id@domain)
            const userGroupIdentifiersForQuery = userGroups.map((g:any) => `${g.group_id}@${g.group_domain}`);
            
            // Check if user has access to the *current* group of the link
            // This is true if currentLinkGroupIdentifier is not null AND it's in the user's list of group identifiers
            const hasAccessToCurrentGroup = !!currentLinkGroupIdentifier && userGroupIdentifiersForQuery.includes(currentLinkGroupIdentifier);

            if (isOwner || hasAccessToCurrentGroup) {
                // If the user is trying to change the group_identifier (e.g. group_id was in req.body),
                // the permission for the *new* group was already checked earlier in the function.
                // If they are only changing description, url, expires, or display_group_name of a link they own
                // or have current group access to, this is allowed.

                // The WHERE clause needs to ensure they can only modify links they own OR are part of their manageable groups.
                // If currentLinkGroupIdentifier is null, only owner can modify (unless they are assigning a group they have access to).
                // If currentLinkGroupIdentifier is not null, they must be in userGroupIdentifiersForQuery.
                
                let whereClausePermission = `user_id = $${slugParamIndex + 1}`;
                const finalQueryParams = [...queryParams, userId];
                let currentParamIndexForWhere = slugParamIndex + 2;

                if (userGroupIdentifiersForQuery.length > 0) {
                    whereClausePermission += ` OR group_identifier = ANY($${currentParamIndexForWhere}::text[])`;
                    finalQueryParams.push(userGroupIdentifiersForQuery);
                }
                
                const updateQuery = `
                    UPDATE urls
                    SET ${setClauseString}
                    WHERE slug = $${slugParamIndex} AND (${whereClausePermission})
                    RETURNING *`;
                
                const updateResult = await client.query(updateQuery, finalQueryParams);

                if (updateResult.rowCount === 0) {
                    console.warn(`[Link] 🚫 Update for link ${slug} by user ${userId} failed. Link not found or permission mismatch during final update.`);
                    res.status(404).send("Link not found or permission mismatch during update.");
                } else {
                    res.status(200).json(updateResult.rows[0]);
                }
            } else {
                console.warn(`[Link] 🚫 User ${userId} denied update of link ${slug} - Not owner or no access to current group ${currentLinkGroupIdentifier}`);
                res.status(403).send("Forbidden: You do not have permission to update this link.");
            }
        }
    } catch (err: any) {
        console.error(`[Link] ❌ Error updating link ${slug} 📁`, err.stack);
        // Handle potential unique constraint violation if changing URL/description makes it non-unique if needed
        if (err.code === "23505") {
            // Unique violation error code in PostgreSQL
            res.status(409).json({
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
    console.log("[Link] getAllLinks: Received request.");
    try {
        const userId = req.user?.sub;
        console.log("[Link] getAllLinks: User ID from token:", userId);
        console.log("[Link] getAllLinks: Full req.user object:", JSON.stringify(req.user, null, 2));


        const userPermissions = Array.isArray(req.user?.permissions)
            ? req.user.permissions.map((perm: string | { id: string }) =>
                typeof perm === "string"
                    ? perm
                    : typeof perm === "object" && perm !== null && "id" in perm
                        ? (perm as { id: string }).id
                        : "" 
            ).filter(p => p !== "")
            : [];
        console.log("[Link] getAllLinks: Parsed userPermissions:", userPermissions);

        const userGroups = req.user?.groups || [];
        console.log("[Link] getAllLinks: Raw userGroups from token:", JSON.stringify(userGroups, null, 2));


        if (!userId) {
            console.warn(`[Link] getAllLinks: User ID not found in token.`);
            res.status(400).json({ error: "User ID not found in token" });
            return;
        }

        const canManageAllLinks = userPermissions.includes("manage-all");
        console.log("[Link] getAllLinks: canManageAllLinks:", canManageAllLinks);

        const selectColumns = "id, slug, url, date, user_id, expires, description, group_identifier, display_group_name, clicks";

        let query;
        let queryParams: any[] = [];

        if (canManageAllLinks) {
            query = `SELECT ${selectColumns} FROM urls ORDER BY date DESC NULLS LAST, expires DESC NULLS LAST`;
            console.log("[Link] getAllLinks: Admin query:", query);
        } else {
            const userGroupIdentifiers = userGroups
                .map((g: any) => {
                    if (g && typeof g.group_id === 'string' && typeof g.group_domain === 'string') {
                        return `${g.group_id}@${g.group_domain}`;
                    }
                    console.warn('[Link] getAllLinks: Malformed group object in userGroups:', g);
                    return null;
                })
                .filter((identifier): identifier is string => identifier !== null);
            console.log("[Link] getAllLinks: Parsed userGroupIdentifiers for query:", userGroupIdentifiers);

            if (userGroupIdentifiers.length > 0) {
                query = `
                  SELECT ${selectColumns} FROM urls 
                  WHERE user_id = $1 
                  OR group_identifier = ANY($2::text[])
                  ORDER BY date DESC NULLS LAST, expires DESC NULLS LAST
                `;
                queryParams = [userId, userGroupIdentifiers];
            } else {
                query = `
                  SELECT ${selectColumns} FROM urls 
                  WHERE user_id = $1
                  ORDER BY date DESC NULLS LAST, expires DESC NULLS LAST
                `;
                queryParams = [userId];
            }
            console.log("[Link] getAllLinks: Non-admin query:", query);
            console.log("[Link] getAllLinks: Non-admin queryParams:", queryParams);
        }

        console.log("[Link] getAllLinks: Executing query:", query, "with params:", JSON.stringify(queryParams));
        const result = await pool.query(query, queryParams);
        console.log("[Link] getAllLinks: Query successful, rowCount:", result.rowCount);

        const formatted = result.rows.map((link) => ({
            ...link,
            date: link.date ? new Date(link.date).toISOString() : null,
            expires: link.expires ? new Date(link.expires).toISOString() : null,
        }));

        res.status(200).json(formatted);
    } catch (error: any) {
        console.error(`[Link] ❌ getAllLinks: Error caught!`);
        console.error(`[Link] ❌ getAllLinks: Error message: ${error.message}`);
        console.error(`[Link] ❌ getAllLinks: Error stack: ${error.stack}`);
        if (error.code) { // Log PostgreSQL error code if available
            console.error(`[Link] ❌ getAllLinks: PostgreSQL error code: ${error.code}`);
        }
        console.error(`[Link] ❌ getAllLinks: Full error object:`, error);
        res.status(500).json({ error: "Server error while retrieving links.", details: error.message });
    }
}
