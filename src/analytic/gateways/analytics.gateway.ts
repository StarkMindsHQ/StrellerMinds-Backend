import {
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

interface RealTimeEvent {
  type: string;
  data: any;
  timestamp: Date;
}

interface RealTimeMetric {
  name: string;
  value: number;
  timestamp: Date;
  dimensions?: Record<string, string>;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/analytics',
})
export class AnalyticsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AnalyticsGateway.name);
  private connectedClients = new Set<string>();

  handleConnection(client: Socket) {
    this.connectedClients.add(client.id);
    this.logger.log(`Client connected: ${client.id}`);

    // Send initial connection confirmation
    client.emit('connected', {
      message: 'Connected to analytics real-time feed',
      timestamp: new Date(),
    });
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  handleSubscribeDashboard(client: Socket, data: { dashboardId: string }) {
    client.join(`dashboard-${data.dashboardId}`);
    this.logger.log(`Client ${client.id} subscribed to dashboard ${data.dashboardId}`);

    client.emit('subscription-confirmed', {
      dashboardId: data.dashboardId,
      timestamp: new Date(),
    });
  }

  handleUnsubscribeDashboard(client: Socket, data: { dashboardId: string }) {
    client.leave(`dashboard-${data.dashboardId}`);
    this.logger.log(`Client ${client.id} unsubscribed from dashboard ${data.dashboardId}`);
  }

  emitRealTimeEvent(event: RealTimeEvent): void {
    this.server.emit('real-time-event', event);
  }

  emitRealTimeMetrics(metrics: RealTimeMetric[]): void {
    this.server.emit('real-time-metrics', {
      metrics,
      timestamp: new Date(),
    });
  }

  emitToDashboard(dashboardId: string, event: string, data: any): void {
    this.server.to(`dashboard-${dashboardId}`).emit(event, {
      ...data,
      timestamp: new Date(),
    });
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }
}
