import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
export class ForumGateway {
  @WebSocketServer()
  server: Server;

  emitNewComment(threadId: string, comment: any) {
    this.server.to(`thread-${threadId}`).emit('comment:new', comment);
  }
}
