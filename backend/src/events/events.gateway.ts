import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token?.split(' ')[1];
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'skai_super_secret_jwt_token_development',
      });
      
      const userId = payload.sub;
      client.join(`user_${userId}`);
      this.logger.log(`User ${userId} connected to WebSocket: ${client.id}`);
    } catch (e) {
      this.logger.error(`WebSocket connection rejected: ${e.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { event: 'pong', data: 'success' };
  }

  /**
   * Push real-time updates for tasks
   */
  notifyTaskUpdate(userId: string, action: 'created' | 'updated' | 'deleted', task: any) {
    this.server.to(`user_${userId}`).emit('task_event', {
      action,
      data: task,
    });
  }

  /**
   * Push notifications
   */
  sendNotification(userId: string, notification: { title: string; body: string; type: string }) {
    this.server.to(`user_${userId}`).emit('notification', notification);
  }
}
