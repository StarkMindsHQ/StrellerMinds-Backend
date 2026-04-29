import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
  WsResponse,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

export interface SubscribePayload {
  channel: string;
}

export interface NotificationPayload {
  type: string;
  data: unknown;
}

@WebSocketGateway({
  namespace: 'notifications',
  cors: { origin: '*' },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  private readonly subscriptions = new Map<string, Set<string>>();

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
    this.subscriptions.set(client.id, new Set());
    client.emit('connected', { id: client.id });
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.subscriptions.delete(client.id);
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribePayload,
  ): Promise<WsResponse<{ channel: string; subscribed: true }>> {
    const channel = this.assertChannel(payload);
    await client.join(channel);
    this.subscriptions.get(client.id)?.add(channel);
    return {
      event: 'subscribed',
      data: { channel, subscribed: true },
    };
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribePayload,
  ): Promise<WsResponse<{ channel: string; subscribed: false }>> {
    const channel = this.assertChannel(payload);
    await client.leave(channel);
    this.subscriptions.get(client.id)?.delete(channel);
    return {
      event: 'unsubscribed',
      data: { channel, subscribed: false },
    };
  }

  @SubscribeMessage('ping')
  handlePing(): WsResponse<{ pong: number }> {
    return { event: 'pong', data: { pong: Date.now() } };
  }

  notifyChannel(channel: string, payload: NotificationPayload): void {
    this.server.to(channel).emit('notification', payload);
  }

  broadcast(payload: NotificationPayload): void {
    this.server.emit('notification', payload);
  }

  getSubscriptions(socketId: string): readonly string[] {
    return Array.from(this.subscriptions.get(socketId) ?? []);
  }

  private assertChannel(payload: SubscribePayload | undefined): string {
    const channel = payload?.channel;
    if (typeof channel !== 'string' || channel.trim() === '') {
      throw new WsException('Invalid channel');
    }
    return channel;
  }
}
