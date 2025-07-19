import { Server, Socket } from 'socket.io';
import { clerkClient, LogisticsRole, hasPermission } from '../lib/auth/clerk-setup';
import { databaseConfig } from '../config/database';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  organizationId?: string;
  role?: LogisticsRole;
  permissions?: string[];
  deviceId?: string;
}

interface AuthSocketData {
  userId: string;
  organizationId?: string;
  role: LogisticsRole;
  permissions: string[];
  deviceId?: string;
  isOffline?: boolean;
  offlineToken?: string;
}

// Socket.io authentication middleware
export function createAuthMiddleware() {
  return async (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      const isOfflineMode = socket.handshake.auth?.offline === 'true';
      const offlineToken = socket.handshake.auth?.offlineToken;
      const deviceId = socket.handshake.auth?.deviceId;

      let userId: string;
      let organizationId: string | undefined;

      if (isOfflineMode && offlineToken) {
        // Handle offline authentication
        const offlineAuth = await validateOfflineToken(offlineToken, deviceId);
        if (!offlineAuth) {
          return next(new Error('Invalid offline token'));
        }
        userId = offlineAuth.userId;
        organizationId = offlineAuth.organizationId;
      } else if (token) {
        // Handle online Clerk authentication
        try {
          const sessionClaims = await clerkClient.verifyToken(token);
          userId = sessionClaims.sub;
          organizationId = sessionClaims.org_id;
        } catch (error) {
          return next(new Error('Invalid authentication token'));
        }
      } else {
        return next(new Error('Authentication required'));
      }

      // Get user details
      const user = await clerkClient.users.getUser(userId);
      const role = user.privateMetadata?.role as LogisticsRole;
      
      if (!role) {
        return next(new Error('User role not found'));
      }

      // Get user permissions
      const permissions = await getUserPermissions(userId, role);

      // Store auth data in socket
      socket.userId = userId;
      socket.organizationId = organizationId;
      socket.role = role;
      socket.permissions = permissions;
      socket.deviceId = deviceId;

      // Join appropriate rooms
      if (organizationId) {
        socket.join(`org:${organizationId}`);
      }
      socket.join(`user:${userId}`);
      socket.join(`role:${role}`);

      // Log connection
      console.log(`Socket authenticated: ${userId} (${role}) in org ${organizationId}`);

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  };
}

// Validate offline token
async function validateOfflineToken(token: string, deviceId?: string): Promise<{ userId: string; organizationId?: string } | null> {
  try {
    const client = await databaseConfig.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          us.user_id,
          u.organization_id,
          us.offline_expires_at
        FROM user_sessions us
        JOIN users u ON us.user_id = u.id
        WHERE us.offline_token_hash = $1
        AND us.device_id = $2
        AND us.is_active = true
        AND us.offline_expires_at > NOW()
      `, [hashToken(token), deviceId]);

      if (result.rows.length === 0) {
        return null;
      }

      const session = result.rows[0];
      return {
        userId: session.user_id,
        organizationId: session.organization_id
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error validating offline token:', error);
    return null;
  }
}

// Get user permissions
async function getUserPermissions(userId: string, role: LogisticsRole): Promise<string[]> {
  try {
    const client = await databaseConfig.connect();
    
    try {
      const result = await client.query('SELECT get_user_permissions($1)', [userId]);
      return result.rows[0]?.get_user_permissions || [];
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

// Hash token for storage
function hashToken(token: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Auth state synchronization handler
export class AuthSocketHandler {
  private io: Server;
  private connectedUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds
  private userSessions = new Map<string, AuthSocketData>(); // socketId -> AuthSocketData

  constructor(io: Server) {
    this.io = io;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
      
      socket.on('auth:ping', () => this.handleAuthPing(socket));
      socket.on('auth:refresh', () => this.handleAuthRefresh(socket));
      socket.on('auth:sync', () => this.handleAuthSync(socket));
      socket.on('permission:check', (data) => this.handlePermissionCheck(socket, data));
      socket.on('disconnect', () => this.handleDisconnection(socket));
    });
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    if (!socket.userId) return;

    // Track connected user
    if (!this.connectedUsers.has(socket.userId)) {
      this.connectedUsers.set(socket.userId, new Set());
    }
    this.connectedUsers.get(socket.userId)!.add(socket.id);

    // Store session data
    this.userSessions.set(socket.id, {
      userId: socket.userId,
      organizationId: socket.organizationId,
      role: socket.role!,
      permissions: socket.permissions!,
      deviceId: socket.deviceId
    });

    // Send current auth state
    socket.emit('auth:state', {
      userId: socket.userId,
      organizationId: socket.organizationId,
      role: socket.role,
      permissions: socket.permissions,
      isAuthenticated: true,
      connectedAt: new Date().toISOString()
    });

    // Notify organization about user connection
    if (socket.organizationId) {
      socket.to(`org:${socket.organizationId}`).emit('user:connected', {
        userId: socket.userId,
        role: socket.role,
        deviceId: socket.deviceId
      });
    }
  }

  private handleAuthPing(socket: AuthenticatedSocket): void {
    socket.emit('auth:pong', {
      timestamp: Date.now(),
      userId: socket.userId,
      isAuthenticated: !!socket.userId
    });
  }

  private async handleAuthRefresh(socket: AuthenticatedSocket): Promise<void> {
    if (!socket.userId) return;

    try {
      // Get fresh user data
      const user = await clerkClient.users.getUser(socket.userId);
      const role = user.privateMetadata?.role as LogisticsRole;
      const permissions = await getUserPermissions(socket.userId, role);

      // Update socket data
      socket.role = role;
      socket.permissions = permissions;

      // Update session cache
      const sessionData = this.userSessions.get(socket.id);
      if (sessionData) {
        sessionData.role = role;
        sessionData.permissions = permissions;
      }

      // Send updated auth state
      socket.emit('auth:refreshed', {
        role,
        permissions,
        refreshedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error refreshing auth:', error);
      socket.emit('auth:error', { message: 'Failed to refresh authentication' });
    }
  }

  private async handleAuthSync(socket: AuthenticatedSocket): Promise<void> {
    if (!socket.userId) return;

    try {
      // Get latest user data from database
      const client = await databaseConfig.connect();
      
      try {
        const result = await client.query(`
          SELECT 
            u.*,
            o.name as organization_name,
            os.status as subscription_status,
            os.tier as subscription_tier
          FROM users u
          LEFT JOIN organizations o ON u.organization_id = o.id
          LEFT JOIN organization_subscriptions os ON o.id = os.organization_id
          WHERE u.clerk_user_id = $1
        `, [socket.userId]);

        if (result.rows.length > 0) {
          const userData = result.rows[0];
          
          socket.emit('auth:synced', {
            user: {
              id: userData.id,
              email: userData.email,
              firstName: userData.first_name,
              lastName: userData.last_name,
              role: userData.role,
              isActive: userData.is_active,
              onboardingCompleted: userData.onboarding_completed
            },
            organization: {
              id: userData.organization_id,
              name: userData.organization_name
            },
            subscription: {
              status: userData.subscription_status,
              tier: userData.subscription_tier
            },
            syncedAt: new Date().toISOString()
          });
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error syncing auth:', error);
      socket.emit('auth:error', { message: 'Failed to sync user data' });
    }
  }

  private async handlePermissionCheck(socket: AuthenticatedSocket, data: { permission: string }): Promise<void> {
    if (!socket.userId || !data.permission) return;

    try {
      const hasPermissionResult = await hasPermission(socket.userId, data.permission);
      
      socket.emit('permission:result', {
        permission: data.permission,
        granted: hasPermissionResult,
        checkedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error checking permission:', error);
      socket.emit('permission:error', { 
        permission: data.permission,
        message: 'Failed to check permission' 
      });
    }
  }

  private handleDisconnection(socket: AuthenticatedSocket): void {
    if (!socket.userId) return;

    // Remove from connected users
    const userSockets = this.connectedUsers.get(socket.userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        this.connectedUsers.delete(socket.userId);
      }
    }

    // Remove session data
    this.userSessions.delete(socket.id);

    // Notify organization about user disconnection
    if (socket.organizationId) {
      socket.to(`org:${socket.organizationId}`).emit('user:disconnected', {
        userId: socket.userId,
        role: socket.role,
        deviceId: socket.deviceId
      });
    }

    console.log(`Socket disconnected: ${socket.userId}`);
  }

  // Broadcast auth state changes to specific users
  public notifyUserAuthChange(userId: string, changes: Partial<AuthSocketData>): void {
    const userSockets = this.connectedUsers.get(userId);
    if (!userSockets) return;

    userSockets.forEach(socketId => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('auth:changed', {
          ...changes,
          changedAt: new Date().toISOString()
        });
      }
    });
  }

  // Broadcast to organization
  public notifyOrganization(organizationId: string, event: string, data: any): void {
    this.io.to(`org:${organizationId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast to users with specific role
  public notifyRole(role: LogisticsRole, event: string, data: any): void {
    this.io.to(`role:${role}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  // Get connected users count
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Get connected users for organization
  public getOrganizationConnectedUsers(organizationId: string): string[] {
    const users: string[] = [];
    
    for (const [socketId, sessionData] of this.userSessions.entries()) {
      if (sessionData.organizationId === organizationId) {
        users.push(sessionData.userId);
      }
    }
    
    return [...new Set(users)]; // Remove duplicates
  }

  // Force disconnect user
  public disconnectUser(userId: string, reason = 'Administrative action'): void {
    const userSockets = this.connectedUsers.get(userId);
    if (!userSockets) return;

    userSockets.forEach(socketId => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('auth:force_disconnect', { reason });
        socket.disconnect(true);
      }
    });
  }
}

// Utility functions for external use
export async function broadcastSubscriptionChange(organizationId: string, subscriptionData: any): Promise<void> {
  // This would be called from the Stripe webhook handler
  const io = global.socketIO as Server;
  if (!io) return;

  io.to(`org:${organizationId}`).emit('subscription:changed', {
    ...subscriptionData,
    changedAt: new Date().toISOString()
  });
}

export async function broadcastUserRoleChange(userId: string, newRole: LogisticsRole, newPermissions: string[]): Promise<void> {
  const io = global.socketIO as Server;
  if (!io) return;

  io.to(`user:${userId}`).emit('auth:role_changed', {
    newRole,
    newPermissions,
    changedAt: new Date().toISOString()
  });
}