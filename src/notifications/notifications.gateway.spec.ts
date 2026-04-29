import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { NotificationsGateway } from './notifications.gateway';

type MockSocket = {
  id: string;
  emit: jest.Mock;
  join: jest.Mock;
  leave: jest.Mock;
};

type MockServer = {
  emit: jest.Mock;
  to: jest.Mock;
};

function createMockSocket(id = 'socket-1'): MockSocket {
  return {
    id,
    emit: jest.fn(),
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockServer(): MockServer & { roomEmit: jest.Mock } {
  const roomEmit = jest.fn();
  return {
    emit: jest.fn(),
    to: jest.fn().mockReturnValue({ emit: roomEmit }),
    roomEmit,
  };
}

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let server: ReturnType<typeof createMockServer>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsGateway],
    }).compile();

    gateway = module.get<NotificationsGateway>(NotificationsGateway);
    server = createMockServer();
    gateway.server = server as unknown as Server;
  });

  describe('handleConnection', () => {
    it('registers the client and emits a "connected" acknowledgement', () => {
      const client = createMockSocket('socket-A');

      gateway.handleConnection(client as unknown as Socket);

      expect(client.emit).toHaveBeenCalledWith('connected', { id: 'socket-A' });
      expect(gateway.getSubscriptions('socket-A')).toEqual([]);
    });

    it('tracks multiple independent connections separately', () => {
      const a = createMockSocket('socket-A');
      const b = createMockSocket('socket-B');

      gateway.handleConnection(a as unknown as Socket);
      gateway.handleConnection(b as unknown as Socket);

      expect(gateway.getSubscriptions('socket-A')).toEqual([]);
      expect(gateway.getSubscriptions('socket-B')).toEqual([]);
    });
  });

  describe('handleDisconnect', () => {
    it('removes the client from the subscription registry', async () => {
      const client = createMockSocket('socket-A');
      gateway.handleConnection(client as unknown as Socket);
      await gateway.handleSubscribe(client as unknown as Socket, {
        channel: 'course:42',
      });

      gateway.handleDisconnect(client as unknown as Socket);

      expect(gateway.getSubscriptions('socket-A')).toEqual([]);
    });

    it('is a no-op for an unknown client id', () => {
      const client = createMockSocket('never-connected');
      expect(() =>
        gateway.handleDisconnect(client as unknown as Socket),
      ).not.toThrow();
    });
  });

  describe('handleSubscribe', () => {
    it('joins the requested channel and tracks the subscription', async () => {
      const client = createMockSocket();
      gateway.handleConnection(client as unknown as Socket);

      const response = await gateway.handleSubscribe(
        client as unknown as Socket,
        { channel: 'course:42' },
      );

      expect(client.join).toHaveBeenCalledWith('course:42');
      expect(gateway.getSubscriptions(client.id)).toEqual(['course:42']);
      expect(response).toEqual({
        event: 'subscribed',
        data: { channel: 'course:42', subscribed: true },
      });
    });

    it('supports subscribing to multiple channels per client', async () => {
      const client = createMockSocket();
      gateway.handleConnection(client as unknown as Socket);

      await gateway.handleSubscribe(client as unknown as Socket, {
        channel: 'course:42',
      });
      await gateway.handleSubscribe(client as unknown as Socket, {
        channel: 'user:99',
      });

      expect(gateway.getSubscriptions(client.id)).toEqual(
        expect.arrayContaining(['course:42', 'user:99']),
      );
    });

    it.each([
      ['missing payload', undefined],
      ['empty channel', { channel: '' }],
      ['whitespace channel', { channel: '   ' }],
      ['non-string channel', { channel: 123 as unknown as string }],
    ])('rejects %s with a WsException', async (_label, payload) => {
      const client = createMockSocket();
      gateway.handleConnection(client as unknown as Socket);

      await expect(
        gateway.handleSubscribe(client as unknown as Socket, payload as never),
      ).rejects.toThrow(WsException);
      expect(client.join).not.toHaveBeenCalled();
    });
  });

  describe('handleUnsubscribe', () => {
    it('leaves the channel and removes it from tracked subscriptions', async () => {
      const client = createMockSocket();
      gateway.handleConnection(client as unknown as Socket);
      await gateway.handleSubscribe(client as unknown as Socket, {
        channel: 'course:42',
      });

      const response = await gateway.handleUnsubscribe(
        client as unknown as Socket,
        { channel: 'course:42' },
      );

      expect(client.leave).toHaveBeenCalledWith('course:42');
      expect(gateway.getSubscriptions(client.id)).toEqual([]);
      expect(response).toEqual({
        event: 'unsubscribed',
        data: { channel: 'course:42', subscribed: false },
      });
    });

    it('rejects an invalid channel payload', async () => {
      const client = createMockSocket();
      gateway.handleConnection(client as unknown as Socket);

      await expect(
        gateway.handleUnsubscribe(client as unknown as Socket, {
          channel: '',
        }),
      ).rejects.toThrow(WsException);
      expect(client.leave).not.toHaveBeenCalled();
    });
  });

  describe('handlePing', () => {
    it('responds with a "pong" event carrying a numeric timestamp', () => {
      const before = Date.now();
      const response = gateway.handlePing();
      const after = Date.now();

      expect(response.event).toBe('pong');
      expect(typeof response.data.pong).toBe('number');
      expect(response.data.pong).toBeGreaterThanOrEqual(before);
      expect(response.data.pong).toBeLessThanOrEqual(after);
    });
  });

  describe('notifyChannel', () => {
    it('emits the notification only to sockets joined to the channel', () => {
      gateway.notifyChannel('course:42', {
        type: 'lesson.published',
        data: { lessonId: 'l1' },
      });

      expect(server.to).toHaveBeenCalledWith('course:42');
      expect(server.roomEmit).toHaveBeenCalledWith('notification', {
        type: 'lesson.published',
        data: { lessonId: 'l1' },
      });
      expect(server.emit).not.toHaveBeenCalled();
    });
  });

  describe('broadcast', () => {
    it('emits the notification to all connected clients', () => {
      gateway.broadcast({ type: 'system.maintenance', data: { in: '5m' } });

      expect(server.emit).toHaveBeenCalledWith('notification', {
        type: 'system.maintenance',
        data: { in: '5m' },
      });
      expect(server.to).not.toHaveBeenCalled();
    });
  });

  describe('end-to-end subscription lifecycle', () => {
    it('connects, subscribes, receives a channel notification, then disconnects', async () => {
      const client = createMockSocket('socket-LIFE');
      gateway.handleConnection(client as unknown as Socket);
      await gateway.handleSubscribe(client as unknown as Socket, {
        channel: 'course:42',
      });

      gateway.notifyChannel('course:42', {
        type: 'lesson.published',
        data: { lessonId: 'l1' },
      });

      expect(server.to).toHaveBeenCalledWith('course:42');
      expect(server.roomEmit).toHaveBeenCalledWith(
        'notification',
        expect.objectContaining({ type: 'lesson.published' }),
      );

      gateway.handleDisconnect(client as unknown as Socket);
      expect(gateway.getSubscriptions('socket-LIFE')).toEqual([]);
    });
  });
});
