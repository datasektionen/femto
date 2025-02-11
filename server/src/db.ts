import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

/**
 * Database connection setup.
 * Exports a PostgreSQL client instance that can be used to query the database.
 *
 * TODO: Current setup is for development purposes only. Ensure to use environment variables
 * for credentials in production.
 */
const client = new Client({
    user: 'postgres',
    host: 'db',
    database: 'mydatabase',
    password: 'postgres',
    port: 5432,
});

// Read the SQL statements from the schemas.sql file
const schemaPath = path.join(__dirname, '../database/schemas.sql');
const createTableStatements = fs.readFileSync(schemaPath, 'utf8');

async function createTables() {
    try {
        await client.query(createTableStatements);
        console.log('Tables created or already exist');
    } catch (err) {
        console.error('Error creating tables', err);
    }
}

async function connectWithRetry(maxRetries: number = 5, delay: number = 2000) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            await client.connect();
            console.log('Connected to the database');
            await createTables();
            return; // Exit the function if connection is successful
        } catch (err: any) {
            console.error(`Attempt ${retries + 1} failed to connect to the database:`, err.message);
            retries++;
            await new Promise(resolve => setTimeout(resolve, delay)); // Wait before retrying
        }
    }
    console.error('Failed to connect to the database after multiple retries.');
    process.exit(1); // Exit the process if connection fails after all retries
}

connectWithRetry();

export default client;