import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config(); // Read the .env file and set the environment variables

/**
 * Database connection setup.
 * Exports a PostgreSQL Pool() instance to be used concurrently by multiple clients.
 *
 */
const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
});

// Read the SQL statements from the schema.sql and insert.sql file
const schemaPath = path.join(__dirname, '../../database/schema.sql');
const insertPath = path.join(__dirname, '../../database/insert.sql');
const schemaStatement = fs.readFileSync(schemaPath, 'utf8');
const insertStatement = fs.readFileSync(insertPath, 'utf8');

/**
 * Function to create tables in the database.
 * Executes the SQL statements read from schema.sql.
 */
async function createTables() {
    try {
        await pool.query(schemaStatement);
        console.log(`[DB] ✅ Tables created or already exist`);
    } catch (err: any) {
        console.error(`[DB] ❌ Error creating tables`, err.stack);
    }
}

/**
 * Function to insert data into the database.
 * Executes the SQL statements read from insert.sql.
 */
async function insertData() {
    let client;
    try {
        client = await pool.connect();
        await client.query(insertStatement);
        console.log(`[DB] ✅ Data inserted or already exist`);
    } catch (err: any) {
        console.error(`[DB] ❌ Error inserting data`, err.stack);
    } finally {
        if (client) {
            client.release();
        }
    }
}

/**
 * Function to connect to the database with retry logic.
 * Retries the connection a specified number of times with a delay between attempts.
 * @param maxRetries - Maximum number of retry attempts.
 * @param delay - Delay between retry attempts in milliseconds.
 */
async function connectWithRetry(maxRetries: number = 5, delay: number = 2000) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            await pool.connect();
            console.log(`[DB] ✅ Connected to the database`);

            await createTables();
            if (process.env.NODE_ENV === 'development') await insertData();

            return; // Exit the function if connection is successful
        } catch (err: any) {
            console.error(`[DB] ⛔ Attempt ${retries + 1} failed to connect to the database`, err.stack);
            retries++;
            await new Promise(resolve => setTimeout(resolve, delay)); // Wait before retrying
        }
    }
    console.error(`[DB] ❌ Failed to connect to the database after multiple retries`);
    process.exit(1); // Exit the process if connection fails after all retries
}

// Initiate the connection with retry logic
connectWithRetry();

export default pool;