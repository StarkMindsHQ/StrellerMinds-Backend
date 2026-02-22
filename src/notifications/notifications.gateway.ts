import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from './services/notifications.service';
import { NotificationQueryDto } from './dto/notification.dto';
import { Notification } from './entities/notifications.entity';

// ── Import as alias to prevent TypeScript picking up the browser's global Notification API

interface AuthenticatedSocket extends Socket {
  userId: string;
  locale: string;
}

interface ConnectedUser {
  sockets: Set<string>;
  userId: string;
  lastSeen: Date;
}

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  private connectedUsers = new Map<string, ConnectedUser>();
  private socketToUser = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
  ) {}

  afterInit(server: Server): void {
    this.logger.log('NotificationsGateway initialized');

    server.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) return next(new Error('Authentication required'));

        const payload = await this.jwtService.verifyAsync(token);
        socket.userId = payload.sub ?? payload.userId;
        socket.locale = payload.locale ?? 'en';

        if (!socket.userId) return next(new Error('Invalid token payload'));

        next();
      } catch {
        next(new Error('Invalid token'));
      }
    });
  }

  async handleConnection(socket: AuthenticatedSocket): Promise<void> {
    const { userId } = socket;
    this.logger.log(`Client connected: ${socket.id} (user: ${userId})`);

    const existing = this.connectedUsers.get(userId);
    if (existing) {
      existing.sockets.add(socket.id);
      existing.lastSeen = new Date();
    } else {
      this.connectedUsers.set(userId, {
        sockets: new Set([socket.id]),
        userId,
        lastSeen: new Date(),
      });
    }
    this.socketToUser.set(socket.id, userId);
    socket.join(`user:${userId}`);

    // Send pending (delivered but unread) notifications immediately
    try {
      const { data: pending } = await this.notificationsService.findByUser(userId, {
        status: 'DELIVERED',
        limit: 50,
        page: 1,
      });
      if (pending.length > 0) {
        socket.emit('pending_notifications', { notifications: pending, count: pending.length });
      }
    } catch (error) {
      this.logger.error(`Failed to send pending notifications to ${userId}`, error);
    }

    socket.emit('connection_established', {
      userId,
      timestamp: new Date().toISOString(),
      serverTime: Date.now(),
    });
  }

  handleDisconnect(socket: AuthenticatedSocket): void {
    const userId = this.socketToUser.get(socket.id);
    this.logger.log(`Client disconnected: ${socket.id} (user: ${userId})`);

    if (userId) {
      const user = this.connectedUsers.get(userId);
      if (user) {
        user.sockets.delete(socket.id);
        if (user.sockets.size === 0) this.connectedUsers.delete(userId);
      }
      this.socketToUser.delete(socket.id);
    }
  }

  // ─── Client → Server ─────────────────────────────────────────────────────

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string },
  ) {
    try {
      const notification = await this.notificationsService.markAsRead(
        socket.userId,
        data.notificationId,
      );
      socket.emit('notification_updated', notification);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  @SubscribeMessage('mark_all_read')
  async handleMarkAllRead(@ConnectedSocket() socket: AuthenticatedSocket) {
    try {
      const count = await this.notificationsService.markAllAsRead(socket.userId);
      socket.emit('all_notifications_read', { count });
      return { success: true, count };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  @SubscribeMessage('dismiss')
  async handleDismiss(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string },
  ) {
    try {
      await this.notificationsService.dismiss(socket.userId, data.notificationId);
      socket.emit('notification_dismissed', { notificationId: data.notificationId });
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  @SubscribeMessage('get_notifications')
  async handleGetNotifications(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() query: NotificationQueryDto,
  ) {
    try {
      const result = await this.notificationsService.findByUser(socket.userId, query);
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() socket: AuthenticatedSocket) {
    const user = this.connectedUsers.get(socket.userId);
    if (user) user.lastSeen = new Date();
    return { event: 'pong', timestamp: Date.now() };
  }

  // ─── Server → Client (via EventEmitter) ──────────────────────────────────

  @OnEvent('notification.websocket')
  handleWebSocketNotification(notification: Notification): void {
    // `notification` is now your typed entity — `.userId` exists
    this.sendToUser(notification.userId, 'new_notification', notification);
  }

  @OnEvent('notification.read')
  handleNotificationRead(data: { notificationId: string; userId: string }): void {
    this.sendToUser(data.userId, 'notification_read', data);
  }

  @OnEvent('notification.all-read')
  handleAllNotificationsRead(data: { userId: string }): void {
    this.sendToUser(data.userId, 'all_read', data);
  }

  // ─── Public helpers ───────────────────────────────────────────────────────

  sendToUser(userId: string, event: string, data: unknown): boolean {
    const room = `user:${userId}`;
    const roomSockets = this.server.sockets.adapter.rooms.get(room);

    if (!roomSockets?.size) {
      this.logger.debug(`User ${userId} not connected — will deliver on next connect`);
      return false;
    }

    this.server.to(room).emit(event, { ...(data as object), timestamp: new Date().toISOString() });
    this.logger.debug(`Sent '${event}' to user ${userId} (${roomSockets.size} sockets)`);
    return true;
  }

  broadcast(event: string, data: unknown): void {
    this.server.emit(event, { ...(data as object), timestamp: new Date().toISOString() });
  }

  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  getConnectedCount(): number {
    return this.connectedUsers.size;
  }

  getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      totalSockets: this.socketToUser.size,
      users: Array.from(this.connectedUsers.values()).map((u) => ({
        userId: u.userId,
        socketCount: u.sockets.size,
        lastSeen: u.lastSeen,
      })),
    };
  }
}
