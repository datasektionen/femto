import pool from '../db';

/**
 * Retrieves all links from the database.
 *
 * @param {any} req - Express request object.
 * @param {any} res - Express response object.
 * @returns {Promise<void>} - A promise that resolves when the links are retrieved and the response is sent.
 */
export async function getAllLinks(req: any, res: any) {
    let client;
    try {
        // Connect to the database
        client = await pool.connect();
        
        // Execute the query to retrieve all links
        const result = await client.query('SELECT * FROM urls');
        
        // Send the retrieved links as a JSON response
        res.status(200).json(result.rows);
    } catch (err: any) {
        // Log the error and send a 500 status code if an error occurs
        console.error('Error retrieving links', err.stack);
        res.status(500).send('Internal Server Error');
    } finally {
        // Release the client back to the pool
        if (client) {
            client.release();
        }
    }
}

/**
 * Retrieves a single link from the database based on the provided slug.
 *
 * @param {any} req - Express request object.
 * @param {any} res - Express response object.
 * @returns {Promise<void>} - A promise that resolves when the link is retrieved and the response is sent.
 */
export async function getLink(req: any, res: any) {
    const { slug } = req.params;
    let client;
    try {
        // Connect to the database
        client = await pool.connect();
        
        // Execute the query to retrieve the link with the specified slug
        const result = await client.query('SELECT * FROM urls WHERE slug = $1', [slug]);
        
        // Check if the link was found
        if (result.rows.length === 0) {
            // Send a 404 status code if the link was not found
            res.status(404).send('Link not found');
        } else {
            // Send the retrieved link as a JSON response
            res.status(200).json(result.rows[0]);
        }
    } catch (err: any) {
        // Log the error and send a 500 status code if an error occurs
        console.error('Error retrieving link', err.stack);
        res.status(500).send('Internal Server Error');
    } finally {
        // Release the client back to the pool
        if (client) {
            client.release();
        }
    }
}
