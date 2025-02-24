import express from 'express';
import cors from 'cors';
import apiRouter from './routes/apiRouter';
import redirectRouter from './routes/redirectRouter';

const app = express();
const PORT = process.env.PORT || 5000; // Fallback to 5000 if PORT is not set

// Enable CORS to allow frontend requests
app.use(cors({
    origin: "http://localhost:3000", // Allow requests from frontend
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json()); // Middleware to parse JSON request bodies

// Routes
app.use("/api", apiRouter);
app.use("/", redirectRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
