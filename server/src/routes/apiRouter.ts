import { Router } from 'express';
import client from '../db';

const apiRouter = Router();

// Define API routes
apiRouter.get('/status', async (req, res) => {
    try {
        const result = await client.query('SELECT NOW()');
        res.json({ status: 'API is running', time: result.rows[0].now });
    } catch (err: any) {
        console.error('Error executing query', err.stack);
        res.status(500).send('Internal Server Error');
    }
});

export default apiRouter;