import { Request, Response } from 'express';
import pool from '../db';

/**
 * Function to get the status of the API.
 * 
 * TODO: Add more detailed status information.
 * 
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @returns {Promise<void>} - A promise that resolves when the status is sent.
 */
export async function getAPIStatus(req: Request, res: Response){
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT NOW()');
        res.status(200).json({ status: 'ok', time: result.rows[0].now });
    } catch (err: any) {
        console.error('❌ Error executing query 📁', err.stack);
        res.status(500).send('Internal Server Error');
    } finally {
        if (client) {
            client.release();
        }
    }
};