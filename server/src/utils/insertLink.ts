import pool from '../db';

/**
 * Generates a short link, either using a provided slug or generating a new one.
 *
 * @param {any} req - Express request object.
 * @param {any} res - Express response object.
 * @returns {Promise<void>} - A promise that resolves when the link is generated and the response is sent.
 */
export async function insertLink(req: any, res: any) {
    const { slug, url, user_id, description, mandate, expires } = req.body;

    if (slug) {
        // If a slug is provided, check if it's already taken
        const slugAlreadyTaken = await checkSlug(slug);

        if (slugAlreadyTaken) {
            return res.status(400).json({ error: 'Slug has already been taken' });
        }

        let client;
        try {
            client = await pool.connect();
            // Insert the new link with the provided slug
            const result = await client.query('INSERT INTO urls (slug, url, user_id, description, mandate, expires) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [slug, url, user_id, description, mandate, expires]);
            res.status(201).json(result.rows[0]);
        } catch (err: any) {
            console.error('Error executing query', err.stack);
            res.status(500).send('Internal Server Error');
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
            const idResult = await client.query('INSERT INTO urls (url, user_id, description, mandate, expires) VALUES ($1, $2, $3, $4, $5) RETURNING id', [url, user_id, description, mandate, expires]);
            const id = idResult.rows[0].id;
            // Generate a base62 slug from the ID
            const slug = generateBase62(id);

            // Update the link with the generated slug
            await client.query('UPDATE urls SET slug = $1 WHERE id = $2', [slug, id]);

            // Retrieve the newly created link
            const result = await client.query('SELECT * FROM urls WHERE id = $1', [id]);
            res.status(201).json(result.rows[0]);

        } catch (err: any) {
            console.error('Error executing query', err.stack);
            res.status(500).send('Internal Server Error');
        } finally {
            if (client) {
                client.release();
            }
        }
    }
}

/**
 * Generates a base62 slug from a given number.
 *
 * @param {number} id - The number to convert to a base62 slug.
 * @returns {string} - The generated base62 slug.
 */
function generateBase62(id: number) {
    // Characters used for base62 encoding
    const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const base = characters.length;
    let slug = '';

    // Convert the ID to a base62 string
    while (id > 0) {
        slug = characters[id % base] + slug;
        id = Math.floor(id / base);
    }

    return slug;
}

/**
 * Checks if a slug is already taken in the database.
 *
 * @param {string} slug - The slug to check.
 * @returns {Promise<boolean>} - A promise that resolves to true if the slug is taken, false otherwise.
 */
async function checkSlug(slug: string) {
    let client;
    try {
        client = await pool.connect();
        const result = await client.query('SELECT * FROM urls WHERE slug = $1', [slug]);
        return result.rows.length > 0;
    } catch (err: any) {
        console.error('Error executing query', err.stack);
        return false;
    } finally {
        if (client) {
            client.release();
        }
    }
}