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

client.connect()
    .then(() => {
        console.log('Connected to the database');
        return createTables(); // Call the function to create tables
    })
    .catch((err) => console.error('Error connecting to the database', err.stack));

export default client;