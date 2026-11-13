const express = require('express');
const path = require('path');

async function startServer() {
  const app = express();
  const PORT = 5179;

  // Middleware to parse JSON
  app.use(express.json());

  // CORS headers for Stremio
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    next();
  });

  // Import the Vercel functions
  const manifestHandler = require('./api/manifest.js');
  const streamHandler = require('./api/stream.js');

  // API Routes (matching vercel.json rewrites)
  app.get('/manifest.json', (req, res) => {
    manifestHandler(req, res);
  });

  app.get('/api/manifest', (req, res) => {
    manifestHandler(req, res);
  });

  app.get('/:config/manifest.json', (req, res) => {
    req.query.config = req.params.config;
    manifestHandler(req, res);
  });

  app.get('/:config/stream/:type/:id', (req, res) => {
    req.query.config = req.params.config;
    req.query.type = req.params.type;
    req.query.id = req.params.id;
    streamHandler(req, res);
  });

  app.get('/api/stream', (req, res) => {
    streamHandler(req, res);
  });

  // Serve static files from public
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
