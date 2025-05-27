import express from 'express';
import apiRouter from './routes/apiRouter';
import redirectRouter from './routes/redirectRouter';
import loginRouter from './routes/loginRouter';
import cors from 'cors';
import { scheduleCleanupJob } from './services/cleanupService';

const app = express();
const PORT = process.env.PORT;
app.use(cors());
app.use(express.json()); // Middleware to parse JSON request bodies

// Routes
// Define specific routes before general ones
app.use("/login", loginRouter); // Specific route for login
app.use("/api", apiRouter);     // Specific route for API
app.use("/", redirectRouter); // General/catch-all routes last

app.listen(PORT, () => {
    console.log(`[Startup] ✅ Server is running on port ${PORT}`);

    console.log(`[Startup] 💻 Client URL: ${process.env.CLIENT_URL}`);

    // Delay starting the cleanup service to give the DB time to start
    console.log(`[Startup] ⏱️ Waiting for database to start up...`);
    setTimeout(() => {
        // Run every hour to clean up expired links
        scheduleCleanupJob('0 * * * *');
    }, 10000); // 10 seconds delay
});
