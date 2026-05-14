import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { searchHandler } from './routes/search.js';
import { setupSocketHandlers } from './sockets/handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(express.static(path.join(__dirname, '../../public')));

// Routes
app.get('/api/search', searchHandler);

// Socket handlers
setupSocketHandlers(io);

// Démarrage serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

export default server;