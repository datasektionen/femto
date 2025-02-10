import { Client } from 'pg';

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


client.connect()
    .then(() => console.log('Connected to the database'))
    .catch((err) => console.error('Error connecting to the database', err.stack));

export default client;