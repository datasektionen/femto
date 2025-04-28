import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

interface UserInfo {
    sub: string; // Subject (user ID)
    name: string;
    email: string;
    // Add other user properties as needed
}

// Extend the Express Request interface to include the user property
declare global {
    namespace Express {
        interface Request {
            user?: UserInfo;
        }
    }
}

export const jwtAuth = (req: Request, res: Response, next: NextFunction): void => {

    
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.status(401).json({ message: 'Authorization header missing' });
        return;
    }

    const token = authHeader.split(' ')[1]; // Extract the token from "Bearer <token>"

    if (!token) {
        res.status(401).json({ message: 'JWT token missing' });
        return;
    }

    try {
        if (!JWT_SECRET) {
            console.error("JWT_SECRET is not set in environment variables!");
            res.status(500).json({ message: 'Server configuration error' });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET!, { algorithms: ['HS256'] }) as UserInfo;
        req.user = decoded; // Attach user info to the request object
        next(); // Proceed to the next middleware/route handler
    } catch (err) {
        console.error("JWT verification error:", err);
        res.status(403).json({ message: 'Invalid JWT token' }); // Forbidden
        return;
    }
};