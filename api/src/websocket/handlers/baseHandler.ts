import { Server, Socket } from 'socket.io';

export abstract class BaseHandler {
  protected io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  /**
   * Initialize event listeners
   */
  protected abstract setupEventListeners(): void;

  /**
   * Handle new socket connection
   */
  public abstract handleConnection(socket: Socket): void;

  /**
   * Validate socket authentication
   */
  protected validateAuthentication(socket: Socket): boolean {
    return socket.handshake.auth && socket.handshake.auth.token;
  }

  /**
   * Log socket events
   */
  protected logEvent(event: string, data: unknown): void {
    console.log(`[${new Date().toISOString()}] ${event}:`, data);
  }

  /**
   * Handle socket errors
   */
  protected handleError(socket: Socket, error: Error): void {
    console.error(`Socket error for ${socket.id}:`, error);
    socket.emit('error', { message: error.message });
  }
}
