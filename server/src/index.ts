import express from 'express';
import { Client } from 'pg';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 5000; //Default to PORT 5000 if not specified

// Serve the static files from the React app
app.use(express.static(path.join(__dirname, '../react')));

// Create database client, see docker-compose.yml for the connection details
const client = new Client({
    user: 'postgres',
    host: 'db',
    database: 'mydatabase',
    password: 'postgres',
    port: 5432,
});

// Connect to the database
client.connect()
    .then(() => console.log('Connected to the database'))
    .catch((err) => console.error('Error connecting to the database', err.stack));

// Empty route, redirect to the chapter website
app.get('/', (req, res) => {
    res.status(301).location('https://datasektionen.se').end();
});

// Redirect to the correct URL based on the slug
app.get('/:slug', async (req, res) => {
    // Get slug from the requested URL
    const slug = req.params.slug;

    // If the slug is 'femto', serve the react app
    if (slug === 'femto') {
        res.sendFile(path.join(__dirname, '../react', 'index.html'));
        return;
    }

    try {
        // Query the database and wait for the result
        const result = await client.query('SELECT url FROM urls WHERE slug = $1', [slug]);

        // If a result is found, redirect to the URL
        if (result.rows.length > 0) {
            res.status(301).location(result.rows[0].url).end();
        } else {
            res.status(404).send('Slug not found');
        }
    } catch (err: any) {
        // Catch any errors as not to crash the server
        console.error('Error executing query', err.stack);
        res.status(500).send('Internal Server Error');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log('Server running on http://localhost:${PORT}');
});