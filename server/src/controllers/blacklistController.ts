import { Request, Response } from 'express';
import { Readable } from 'stream';
import * as readline from 'readline';

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
    const batchedInsertionSize = 100; // Number of links to insert at once

    let client;
    client = await pool.connect();

    await client.query(`CREATE TABLE IF NOT EXISTS blockedurls (url varchar(255) PRIMARY KEY);`);

    let queryBase = `INSERT INTO blockedurls (url) VALUES `;
    let queryBaseCopy = queryBase;
    let insertCounter = 0;

    let internalLinkCounter = 0;
    let totalLinks = links.length;

    if (totalLinks === 0) {
        console.log("No links to add to the blacklist.");
        client.release();
        return;
    }


    for (const link of links) {
        if (insertCounter === 0) {
            queryBaseCopy += `('${link}')`;
            insertCounter++;
        } else if (insertCounter < batchedInsertionSize) {
            queryBaseCopy += `, ('${link}')`;
            insertCounter++;
        } else {
            try {
                queryBaseCopy += ` ON CONFLICT DO NOTHING;`;
                await client.query(queryBaseCopy);
                
                internalLinkCounter += insertCounter;
                queryBaseCopy = queryBase;
                insertCounter = 0;

            } catch (err: any) {
                console.error('Error inserting links', err.stack);
            }

            if (internalLinkCounter % 200000 === 0) {
                console.log(`Inserted ${internalLinkCounter} links out of ${totalLinks} into the blacklist.
                    Progress: ${Math.round((internalLinkCounter / totalLinks) * 100)}%`);
        
            }
        }

    }
    if (queryBaseCopy !== queryBase) {
        queryBaseCopy += ` ON CONFLICT DO NOTHING;`;
        await client.query(queryBaseCopy);
        internalLinkCounter += insertCounter;
    }
    console.log(`Link insertion progress: 100%`);


    client.release();
}



interface MulterRequest extends Request {
  file?: Express.Multer.File;
}
/**
 * Inserts every line of the given file into the database blacklist "blockedurls",
 * if it does not already exist within the table.
 * @param req File upload request
 * @param res Response object
 * @returns {Promise<void>} - A void promise that resolves when the file is processed.
 */
export async function blacklistFile(req: MulterRequest, res: Response): Promise<void> {
  console.log('blacklistFile called');

  const multerReq = req as Request; // Explicitly cast req to MulterRequest
  try {
      if (!multerReq.file) {
        res.status(400).send('No file uploaded');
        return;
      }
  
      // Convert buffer to stream
      const bufferStream = new Readable();
      if (req.file) {
        bufferStream.push(req.file.buffer);
      } else {
        res.status(400).send('No file uploaded');
        return;
      }
      bufferStream.push(null);
  
      const rl = readline.createInterface({
        input: bufferStream,
        crlfDelay: Infinity,
      });

      const lines: string[] = [];
      rl.on('line', (line: string) => {
        if (line.startsWith("#")) return; // Skip comments
        lines.push(line.trim());
      });

      await databaseInsertBlacklist(lines);
      console.log('File processed and links blacklisted successfully.');

      
      res.status(200).send(lines);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error processing file.');
    }
}