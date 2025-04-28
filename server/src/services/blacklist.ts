import fs from "fs";
import pool from "../db";

/**
* Quries databae for given link and returns true if it is blacklisted.
* 
* @param {string} link - The link to check.
* @returns {boolean} - True if the link is in the blacklist, false otherwise.
* @async
*/
export async function isBlacklistedDB(link: string): Promise<boolean> {
   const host = new URL(link).host;
   const linkVariants = [host, `www.${host}`, host.replace(/www[.]/, "")];

   let client;
   client = await pool.connect();
   for (const linkVariant of linkVariants) {
       try {
           const result = await client.query('SELECT * FROM blockedurls WHERE url = $1', [linkVariant]);
           if ( result.rowCount !== null && result.rowCount > 0) {
               //console.log(`Link ${linkVariant} is blacklisted`);  //Testing
               client.release();
               return true;
           }

       } catch (err: any) {
           console.error('Error retrieving links', err.stack);
       }
   };
   //console.log(`Link ${host} is not blacklisted`); //Testing
   client.release();
   return false;
}



/**
 * Adds given links to the database blacklist "blockedurls",
 * if it does not already exist within the table.
 * @param {string[]} links - The links to add to the blacklist.
 */
export async function databaseInsertBlacklist(links: string[]) {


    let client;
    client = await pool.connect();
    console.log(links); //Testing

    //Create table if it doesn't exist.
    await client.query(`CREATE TABLE IF NOT EXISTS blockedurls (url varchar(255) PRIMARY KEY);`);

    //Add each of the links to the blacklist if they do not already exist.
    let addedLinks = 0;
    let existingLinks = 0;
    let totalLinksTried = 0;
    for (const link of links) {
        try {
            const result = await client.query('SELECT * FROM blockedurls WHERE url = $1;', [link.trim()]);
            if (result.rowCount !== null && result.rowCount > 0) {
                //console.log(`Link '${link.trim()}' already exists in the blacklist`); //Testing
                existingLinks++;
                totalLinksTried++;
            } else {
                await client.query('INSERT INTO blockedurls (url) VALUES ($1);', [link.trim()]);
                //console.log(`Link '${link.trim()}' added to the blacklist`); //Testing
                addedLinks++;
                totalLinksTried++;
            }

        } catch (err: any) {

            console.error('Error adding links', err.stack); 
        }
        if (totalLinksTried % 5000 === 0) {
            console.log(`Processed ${totalLinksTried} links`); //Testing
            console.log(`Added ${addedLinks} links to the blacklist`); //Testing
            console.log(`Existing ${existingLinks} links in the blacklist`); //Testing
        }
    }

    client.release();
}