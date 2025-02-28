import fs from "fs";
import pool from "../db";

/*
Copied from the existing Pico
*/
export const blacklist: Record<string, boolean> = {};

const getBlackList = () => {
    // Read blacklist from file
    (async () => {
        console.log("Start read");
        //File used temporarily to store the blacklist, will be replaced by the database.
        const file = fs.readFileSync('./everything.txt');
        const lines = file.toString().split("\n");
        for (const line of lines) {
            if (line.startsWith("#")) continue;
            blacklist[line] = true;
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
            blacklist[link] = true;
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

/**
 * Checks if link is blacklisted.
 * 
 * @param {string} link - The link to check.
 * @returns {boolean} - True if the link is in the blacklist, false otherwise.
 */
export function isBlacklisted(link: string): boolean {
    const host = new URL(link).host;
    if (
        blacklist[host] ||
        blacklist[`www.${host}`] ||
        blacklist[host.replace(/www[.]/, "")]
    ) { return true; }
    return false;
}
