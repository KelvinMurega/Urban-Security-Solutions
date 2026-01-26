import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());       // Allows the frontend to talk to the backend
app.use(helmet());     // Adds security headers 
app.use(express.json()); // Parses incoming JSON requests

// Health Check Route
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    system: 'Urban Security Solutions API', 
    status: 'Operational', 
    timestamp: new Date() 
  });
});

app.listen(PORT, () => {
  console.log(`[Urban Security Backend]: Running at http://localhost:${PORT}`);
});