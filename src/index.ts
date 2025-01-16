import express, { Request, Response } from 'express';
import { Client } from 'pg';

const app = express();
const PORT = process.env.PORT || 3000; // Default to 3000 if PORT is not set

// Initialize PostgreSQL client
const client = new Client({
    user: 'postgres',
    host: 'postgres-db', // This is the container name
    database: 'mydatabase',
    password: 'postgres',
    port: 5432, // Default port for PostgreSQL
});

// Connect to PostgreSQL
client.connect()
    .then(() => console.log('Connected to PostgreSQL'))
    .catch(err => console.error('Connection error', err.stack));

// Define a route handler for the default home page. Basically what happens when the user goes to http://[URL]/
app.get('/', async (req: Request, res: Response) => {
    try {
        // Query the database and await the result
        const result = await client.query('SELECT * FROM links');
        // Send the result to the user
        res.send('PostgreSQL Time: ${result.rows[0].now}');
    } catch (err) {
        res.status(500).send(err);
    }
});

// start the Express server and listen on PORT
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
    