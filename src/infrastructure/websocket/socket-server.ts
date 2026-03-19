/**
 * WebSocket Server — Real-time communication via Socket.io
 *
 * Channels:
 * - /assistant: AI assistant chat (real-time message streaming)
 * - /notifications: Push notifications (reminders, approvals, alerts)
 * - /sync-status: HRIS sync progress updates
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getRedisClient, getSubscriberClient, isRedisAvailable } from '../redis';
import { createAdapter } from '@socket.io/redis-adapter';

let io: SocketIOServer | null = null;

export interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    tenantId: string;
    role: string;
  };
}

/**
 * Initialize Socket.io server with Redis adapter for horizontal scaling
 */
export function initializeWebSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Redis adapter for multi-pod scaling (only if Redis is connected)
  if (process.env.REDIS_URL && isRedisAvailable()) {
    try {
      const pubClient = getRedisClient();
      const subClient = getSubscriberClient();
      io.adapter(createAdapter(pubClient, subClient));
      console.info('[WebSocket] Redis adapter enabled for multi-pod scaling');
    } catch (err) {
      console.warn('[WebSocket] Redis adapter failed — running in single-node mode');
    }
  } else {
    console.info('[WebSocket] Running without Redis adapter (single-node mode)');
  }

  // Authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      // Validate JWT token (uses same auth service as REST API)
      const decoded = await validateToken(token);
      (socket as AuthenticatedSocket).data = {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        role: decoded.role,
      };
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const { userId, tenantId } = authSocket.data;

    // Join tenant room (for broadcast to all tenant users)
    socket.join(`tenant:${tenantId}`);

    // Join user-specific room (for targeted messages)
    socket.join(`user:${userId}`);

    // === Assistant Chat Channel ===
    socket.on('assistant:message', async (data: { message: string; conversationId?: string }) => {
      socket.emit('assistant:typing', { status: 'processing' });

      try {
        // Lazy import to avoid circular dependency
        const { AssistantController } = await import('../../services/assistant/assistant-controller');
        const controller = new AssistantController();

        const response = await controller.processMessage({
          message: data.message,
          conversationId: data.conversationId,
          tenantId,
          userId,
          userRole: authSocket.data.role,
        });

        // Response is already sent via sendAssistantResponse in the controller
        // Also emit completion signal
        socket.emit('assistant:typing', { status: 'complete' });
      } catch (error) {
        console.error('[WebSocket] Assistant processing error:', (error as Error).message);
        socket.emit('assistant:error', { message: 'Failed to process your message. Please try again.' });
      }
    });

    socket.on('disconnect', () => {
      socket.leave(`tenant:${tenantId}`);
      socket.leave(`user:${userId}`);
    });
  });

  return io;
}

/**
 * Get the Socket.io server instance
 */
export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('WebSocket server not initialized. Call initializeWebSocket() first.');
  }
  return io;
}

// === Emit helpers ===

/**
 * Send notification to a specific user
 */
export function notifyUser(userId: string, event: string, data: unknown): void {
  io?.to(`user:${userId}`).emit(event, data);
}

/**
 * Broadcast to all users in a tenant
 */
export function notifyTenant(tenantId: string, event: string, data: unknown): void {
  io?.to(`tenant:${tenantId}`).emit(event, data);
}

/**
 * Send assistant response to user (streaming or complete)
 */
export function sendAssistantResponse(userId: string, data: {
  conversationId: string;
  content: string;
  isComplete: boolean;
  suggestedActions?: Array<{ id: string; label: string; type: string }>;
}): void {
  io?.to(`user:${userId}`).emit('assistant:response', data);
}

/**
 * Send HRIS sync status update
 */
export function sendSyncStatus(tenantId: string, data: {
  connectorId: string;
  status: string;
  progress: number;
  message: string;
}): void {
  io?.to(`tenant:${tenantId}`).emit('sync:status', data);
}

async function validateToken(token: string): Promise<{ userId: string; tenantId: string; role: string }> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  const decoded = jwt.verify(token, secret) as { userId: string; tenantId: string; role: string };
  return decoded;
}
