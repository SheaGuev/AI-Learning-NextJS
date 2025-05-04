const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  console.log('Next.js app prepared');
  
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Socket.IO setup with explicit CORS settings
  const io = new Server(server, {
    path: '/api/socket',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    allowEIO3: true,
    transports: ['polling', 'websocket']
  });

  // Socket event handlers
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('create-room', (roomId) => {
      console.log(`Socket ${socket.id} joining room: ${roomId}`);
      socket.join(roomId);
    });

    socket.on('send-changes', (delta, roomId) => {
      console.log(`Changes received from ${socket.id} for room ${roomId}`);
      socket.to(roomId).emit('receive-changes', delta, roomId);
    });

    socket.on('send-cursor-move', (range, roomId, cursorId) => {
      console.log(`Cursor move from ${socket.id} (${cursorId}) for room ${roomId}`);
      socket.to(roomId).emit('receive-cursor-move', range, cursorId);
    });

    socket.on('disconnect', (reason) => {
      console.log(`Socket ${socket.id} disconnected: ${reason}`);
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO server running on path: /api/socket`);
  });
}); 