import express from 'express';
import apiRouter from './routes/apiRouter';
import redirectRouter from './routes/redirectRouter';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT;
app.use(cors()); // Middleware to enable CORS
app.use(express.json()); // Middleware to parse JSON request bodies

// Routes
app.use("/api", apiRouter);
app.use("/", redirectRouter);

app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT} 🚀`);
});
