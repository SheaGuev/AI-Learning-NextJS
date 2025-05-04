import { Server as NetServer } from 'http';
import { NextRequest } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import { Socket } from 'socket.io';

// Extend the global object to include our socket server
declare global {
  var socketIOServer: SocketIOServer | undefined;
  var server: NetServer;
}

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  try {
    // Get the SocketIO server instance from the global object or create a new one
    const res: any = {
      socket: {
        server: global.server,
      },
    };

    // Check if the socketIOServer already exists on the global object
    if (!global.socketIOServer) {
      // Create a new SocketIO server if one doesn't exist
      console.log('Creating new SocketIO server');
      const httpServer: NetServer = res.socket.server;
      global.socketIOServer = new SocketIOServer(httpServer, {
        path: '/api/socket/io',
        addTrailingSlash: false,
        cors: {
          origin: '*',
          methods: ['GET', 'POST'],
        },
      });

      // Set up socket event handlers
      global.socketIOServer.on('connection', (socket: Socket) => {
        console.log('Socket connected:', socket.id);

        socket.on('create-room', (roomId: string) => {
          console.log(`Socket ${socket.id} joining room: ${roomId}`);
          socket.join(roomId);
        });

        socket.on('send-changes', (delta: any, roomId: string) => {
          console.log(`Changes received from ${socket.id} for room ${roomId}`);
          socket.to(roomId).emit('receive-changes', delta, roomId);
        });

        socket.on('send-cursor-move', (range: any, roomId: string, cursorId: string) => {
          console.log(`Cursor move from ${socket.id} (${cursorId}) for room ${roomId}`);
          socket.to(roomId).emit('receive-cursor-move', range, cursorId);
        });

        socket.on('disconnect', (reason: string) => {
          console.log(`Socket ${socket.id} disconnected: ${reason}`);
        });
      });
    }

    return new Response('Socket.IO server running', {
      status: 200,
    });
  } catch (error) {
    console.error('Socket.IO server error:', error);
    return new Response('Internal Server Error', {
      status: 500,
    });
  }
} 