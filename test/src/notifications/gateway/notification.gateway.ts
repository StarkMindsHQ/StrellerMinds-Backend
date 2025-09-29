import { WebSocketGateway, WebSocketServer, SubscribeMessage } from "@nestjs/websockets"
import { Logger, UseGuards } from "@nestjs/common"
import type { Server, Socket } from "socket.io"
import { OnEvent } from "@nestjs/event-emitter"
import { JwtWsAuthGuard } from "../../auth/guards/jwt-ws-auth.guard" // Assuming you have a WebSocket JWT guard
import type { NotificationService } from "../services/notification.service"
import { Notification } from "../entities/notification.entity"

@WebSocketGateway({
  cors: {
    origin: "*", // Adjust for your frontend origin
    credentials: true,
  },
  namespace: "/notifications", // Optional: namespace for notifications
})
export class NotificationGateway {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(NotificationGateway.name)

  constructor(private readonly notificationService: NotificationService) {}

  // Handle client connection
  async handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`)
    // You might want to authenticate the user here and associate socket with userId
    // For example, by checking a JWT token passed in handshake.auth or query
    // client.join(userId); // Join a room for the user
  }

  // Handle client disconnection
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)
  }

  // Example: Subscribe to new notifications for a user
  @UseGuards(JwtWsAuthGuard) // Protect this endpoint with WebSocket JWT guard
  @SubscribeMessage("subscribeToNotifications")
  async subscribeToNotifications(client: Socket, data: { userId: string }) {
    // In a real app, ensure data.userId matches authenticated user's ID
    this.logger.log(`Client ${client.id} subscribing to notifications for user ${data.userId}`)
    client.join(data.userId) // Join a room specific to the user ID
    // Send any unread notifications on subscription
    const unreadNotifications = await this.notificationService.getNotificationHistory(data.userId, {
      status: Notification.NotificationStatus.SENT,
    })
    client.emit("initialNotifications", unreadNotifications)
    return { event: "subscribed", status: "success" }
  }

  // Listen for events from NotificationService to push real-time updates
  @OnEvent("notification.new")
  async handleNewNotificationEvent(payload: { userId: string; notification: Notification }) {
    this.logger.log(`Emitting new notification to user ${payload.userId}: ${payload.notification.id}`)
    this.server.to(payload.userId).emit("newNotification", payload.notification)
  }

  @OnEvent("notification.read")
  async handleNotificationReadEvent(payload: { userId: string; notificationId: string }) {
    this.logger.log(`Emitting notification read event for user ${payload.userId}: ${payload.notificationId}`)
    this.server.to(payload.userId).emit("notificationRead", { notificationId: payload.notificationId })
  }

  @OnEvent("notification.clicked")
  async handleNotificationClickedEvent(payload: { userId: string; notificationId: string }) {
    this.logger.log(`Emitting notification clicked event for user ${payload.userId}: ${payload.notificationId}`)
    this.server.to(payload.userId).emit("notificationClicked", { notificationId: payload.notificationId })
  }

  // Example: Mark notification as read via WebSocket
  @UseGuards(JwtWsAuthGuard)
  @SubscribeMessage("markNotificationAsRead")
  async markAsRead(client: Socket, data: { notificationId: string }) {
    // Assuming client.user is populated by JwtWsAuthGuard
    const userId = client.user?.["id"]
    if (!userId) {
      return { event: "markNotificationAsRead", status: "failed", message: "Unauthorized" }
    }
    try {
      const updatedNotification = await this.notificationService.markNotificationAsRead(data.notificationId, userId)
      return { event: "markNotificationAsRead", status: "success", notification: updatedNotification }
    } catch (error) {
      this.logger.error(`Failed to mark notification as read via WebSocket: ${error.message}`)
      return { event: "markNotificationAsRead", status: "failed", message: error.message }
    }
  }
}
