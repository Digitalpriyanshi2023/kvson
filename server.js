import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Vercel backend serverless function handlers
import directoryHandler from './api/directory.js';
import loginHandler from './api/login.js';
import enrollHandler from './api/enroll.js';
import profileHandler from './api/profile.js';
import adminHandler from './api/admin.js';

// Resolve project directories
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load local configurations
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Set up middleware
app.use(cors());
app.use(express.json());

// Backend Serverless Function API mappings
app.all('/api/directory', directoryHandler);
app.all('/api/login', loginHandler);
app.all('/api/enroll', enrollHandler);
app.all('/api/profile', profileHandler);
app.all('/api/admin/*', adminHandler);
app.all('/api/admin', adminHandler);

// Security boundary to prevent exposure of api source files or sensitive directories
app.use('/api', (req, res) => {
  return res.status(404).json({ error: 'API endpoint not found.' });
});

app.use((req, res, next) => {
  const file = req.path.toLowerCase();
  if (
    file.includes('.env') || 
    file.includes('package.json') || 
    file.includes('package-lock.json') || 
    file.startsWith('/api') ||
    file.startsWith('/.git') ||
    file.startsWith('/.venv')
  ) {
    return res.status(403).send('Access forbidden.');
  }
  next();
});

// Serve frontend static assets from the root workspace folder
app.use(express.static(__dirname));

// SPA routing fallback (serves index.html for undefined browser navigation routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Run local development server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(` KVSON Local Development Server Initialized Successfully`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` Serving directory: ${__dirname}`);
  console.log(`======================================================\n`);
});
