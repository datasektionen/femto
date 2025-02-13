import fs from "fs";
import { Pool } from "pg";

// Initialize the pool
const pool = new Pool({
    user: 'db_user',
    host: 'db_host',
    database: 'db_name',
    password: 'db_password',
    port: 5432, // default PostgreSQL port
});

/*
Copied from the existing Pico
*/
export const blackList: Record<string, boolean> = {};

const getBlackList = () => {
    // Read blacklist from file
    (async () => {
        console.log("Start read");
        //File kept in the same directory temporarily, since it will be replaced by the database later.
        const file = fs.readFileSync('./everything.txt');
        const lines = file.toString().split("\n");
        for (const line of lines) {
            if (line.startsWith("#")) continue;
            blackList[line] = true;
        }
        console.log("Read file");
    })();
};

//Work in progress function to call the postgresql database
const getBlackList2 = async () => {
    let client;
    try {
        // Connect to the database
        client = await pool.connect();

        // Execute the query to retrieve all links
        const result = await client.query('SELECT * FROM urls');

        //for every link in result.rows, add it to the blacklist
        for (const link of result.rows) {
            blackList[link] = true;
        }

    } catch (err: any) {   
        //Error getting the links
        console.error('Error retrieving links', err.stack);

    } finally {
        // Release the client back to the pool
        if (client) {
            client.release();
        }
    }

}

getBlackList();
