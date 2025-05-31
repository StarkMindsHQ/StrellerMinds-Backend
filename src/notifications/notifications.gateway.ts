import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';
import {
  NotificationStatus,
  type Notification,
} from './entities/notification.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly userSocketMap = new Map<string, Set<string>>();
  private readonly socketUserMap = new Map<string, string>();

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        throw new WsException('Unauthorized');
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      // Store socket connection
      this.socketUserMap.set(client.id, userId);

      if (!this.userSocketMap.has(userId)) {
        this.userSocketMap.set(userId, new Set());
      }

      this.userSocketMap.get(userId).add(client.id);

      this.logger.log(`Client connected: ${client.id} for user ${userId}`);

      // Send unread count
      const unreadCount =
        await this.notificationsService.getUnreadCount(userId);
      client.emit('unread_count', unreadCount);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketUserMap.get(client.id);

    if (userId) {
      const userSockets = this.userSocketMap.get(userId);

      if (userSockets) {
        userSockets.delete(client.id);

        if (userSockets.size === 0) {
          this.userSocketMap.delete(userId);
        }
      }

      this.socketUserMap.delete(client.id);
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket) {
    const userId = this.socketUserMap.get(client.id);

    if (!userId) {
      throw new WsException('Unauthorized');
    }

    this.logger.log(`User ${userId} subscribed to notifications`);
    return { event: 'subscribed', data: { success: true } };
  }

  // import { NotificationStatus } from './path/to/your/notification-status.enum';

  @SubscribeMessage('mark_read')
  async handleMarkRead(client: Socket, payload: { id: string }) {
    const userId = this.socketUserMap.get(client.id);

    if (!userId) {
      throw new WsException('Unauthorized');
    }

    // Use the enum value instead of the string literal
    await this.notificationsService.update(
      payload.id,
      { status: NotificationStatus.READ },
      userId,
    );

    const unreadCount = await this.notificationsService.getUnreadCount(userId);

    // Notify all user's connected clients about the updated count
    this.sendToUser(userId, 'unread_count', unreadCount);

    return { event: 'marked_read', data: { success: true } };
  }

  @OnEvent('notification.created')
  handleNotificationCreated(notification: Notification) {
    const userId = notification.userId;
    const userSockets = this.userSocketMap.get(userId);

    if (userSockets && userSockets.size > 0) {
      this.sendToUser(userId, 'notification', notification);

      // Also update unread count
      this.notificationsService.getUnreadCount(userId).then((count) => {
        this.sendToUser(userId, 'unread_count', count);
      });
    }
  }

  private sendToUser(userId: string, event: string, data: any) {
    const userSockets = this.userSocketMap.get(userId);

    if (userSockets) {
      for (const socketId of userSockets) {
        this.server.to(socketId).emit(event, data);
      }
    }
  }
}
