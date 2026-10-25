import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter, setWsBroadcaster } from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mount Corporate Statutory API Router
app.use('/api', apiRouter);

// WebSocket setup for streaming agent steps
import { continuousObservability } from './services/continuousObservability.js';

// WebSocket setup for streaming agent steps and live screencast frames
const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to FormMind Continuous Observability & Agent Stream'
  }));

  // Register with Continuous Observability for live screencast stream
  continuousObservability.registerWsClient(ws);

  ws.on('close', () => {
    clients.delete(ws);
  });
});

// Configure broadcaster
setWsBroadcaster((step) => {
  const payload = JSON.stringify({ type: 'agent_step', data: step });
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
});

// Serve frontend in production if built
const clientDist = path.resolve(__dirname, '../dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
    return next();
  }
  const indexPath = path.join(clientDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.send(`<h2>FormMind MCA Automation Backend Server running on port ${PORT}</h2><p>Please access the dashboard at port 5173.</p>`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🏛️ FormMind MCA Corporate Filing Agent Server on http://localhost:${PORT}`);
  console.log(`📡 WebSocket Agent Stream: ws://localhost:${PORT}/ws`);
  console.log(`=======================================================`);
});
