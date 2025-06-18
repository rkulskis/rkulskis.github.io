import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { YamlDataLoader } from './yaml-loader';
import { createRoutes } from './routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Set up YAML data loader
const dataPath = path.join(__dirname, '../../../data');
const dataLoader = new YamlDataLoader(dataPath);

dataLoader.onDataChange(() => {
  console.log('Data files changed - cache invalidated');
});

// Register API routes
app.use(createRoutes(dataLoader));

// Serve static frontend files from "public" directory
const staticDir = path.join(__dirname, '../public');
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));

  // Catch-all route for React Router (only for non-API paths)
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(staticDir, 'index.html'));
  });
} else {
  console.warn('⚠️  Static frontend directory does not exist:', staticDir);
}

// Optional root API info
app.get('/api', (req, res) => {
  res.json({
    message: 'PhilsAxioms API Server',
    version: '1.0.0',
    endpoints: {
      graph: '/api/graph',
      questionnaire: '/api/questionnaire',
      axioms: '/api/axioms/:id',
      axiomsByCategory: '/api/axioms/category/:category',
      connections: '/api/axioms/:id/connections',
      sessions: '/api/sessions',
      health: '/api/health'
    }
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 PhilsAxioms server running at http://localhost:${PORT}`);
  console.log(`📁 Data path: ${dataPath}`);
  if (fs.existsSync(staticDir)) {
    console.log(`🌐 Serving static frontend from: ${staticDir}`);
  }
});

// Graceful shutdown
const shutdown = () => {
  console.log('🛑 Shutdown signal received, cleaning up...');
  dataLoader.close();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
