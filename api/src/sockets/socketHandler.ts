import { Server, Socket } from 'socket.io';

export const socketHandler = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // Join driver room for location updates
    socket.on('join_driver_room', (driverId: string) => {
      socket.join(`driver_${driverId}`);
      console.log(`Driver ${driverId} joined room`);
    });
    
    // Join dispatcher room for job updates
    socket.on('join_dispatcher_room', (companyId: string) => {
      socket.join(`company_${companyId}`);
      console.log(`Dispatcher joined company ${companyId} room`);
    });
    
    // Handle driver location updates
    socket.on('driver_location_update', (data: {
      driverId: string;
      latitude: number;
      longitude: number;
      timestamp: string;
    }) => {
      // Broadcast to company dispatchers
      socket.to(`company_${data.driverId}`).emit('driver_location_updated', data);
    });
    
    // Handle job status updates
    socket.on('job_status_update', (data: {
      jobId: string;
      status: string;
      timestamp: string;
    }) => {
      // Broadcast to relevant rooms
      io.emit('job_status_updated', data);
    });
    
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};