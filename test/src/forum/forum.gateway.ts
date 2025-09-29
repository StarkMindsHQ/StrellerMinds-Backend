/* eslint-disable prettier/prettier */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

/**
 * ForumGateway handles real-time forum events via WebSocket.
 */
@WebSocketGateway()
export class ForumGateway {
  @WebSocketServer() server: Server;

  /**
   * Handle new reply event and emit updates to thread subscribers.
   * @param data - Reply data
   */
  @SubscribeMessage('newReply')
  handleNewReply(@MessageBody() data: any) {
    this.server.emit(`thread_${data.threadId}_updates`, data);
  }
}
