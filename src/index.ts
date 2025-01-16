import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
    res.send('Hello, TypeScript World!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
