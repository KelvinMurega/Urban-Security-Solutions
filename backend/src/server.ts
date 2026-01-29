// backend/src/server.ts
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

// Import Routes
import authRoutes from './modules/auth/auth.routes';
import siteRoutes from './modules/sites/site.routes';
import userRoutes from './modules/users/users.routes';
import shiftRoutes from './modules/shifts/shifts.routes';
import incidentRoutes from './modules/incidents/incidents.routes';
import reportRoutes from './modules/reports/reports.routes';     

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: true, 
  credentials: true 
}));
app.use(helmet());
app.use(cookieParser());
app.use(express.json());

// Request Logger (Helps debug 404s)
app.use((req, res, next) => {
  console.log(`[REQUEST]: ${req.method} ${req.url}`);
  next();
});

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/incidents', incidentRoutes); 
app.use('/api/reports', reportRoutes);     

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.json({ system: 'Operational' });
});

app.listen(PORT, () => {
  console.log(`[Urban Security Backend]: Running at http://localhost:${PORT}`);
});