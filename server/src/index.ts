import express from 'express';
import apiRouter from './routes/apiRouter';
import redirectRouter from './routes/redirectRouter';
import loginRouter from './routes/loginRouter';
import cors from 'cors';
import { scheduleCleanupJob } from './services/cleanupService';

const app = express();
const PORT = process.env.PORT;
app.use(cors()); // Middleware to enable CORS
app.use(express.json()); // Middleware to parse JSON request bodies

// Routes
// Define specific routes before general ones
app.use("/login", loginRouter); // Specific route for login
app.use("/api", apiRouter);     // Specific route for API
app.use("/", redirectRouter); // General/catch-all routes last

app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT} 🚀`);
    
    // Delay starting the cleanup service to give the DB time to start
    console.log('⏱️ Waiting for database to start up...');
    setTimeout(() => {
        // Run every hour to clean up expired links
        scheduleCleanupJob('0 * * * *');
    }, 10000); // 10 seconds delay
});
