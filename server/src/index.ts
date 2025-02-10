import express from 'express';
import apiRouter from './routes/apiRouter';
import redirectRouter from './routes/redirectRouter';

const app = express();
const PORT = process.env.PORT || 5000; // Default to PORT 5000 if not specified

app.use("/api", apiRouter);
app.use("/", redirectRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});