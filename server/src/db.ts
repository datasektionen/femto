import { Client } from 'pg';

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