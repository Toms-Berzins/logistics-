import { Server } from 'socket.io';
import DriverEventHandler from './driverEvents';

let driverEventHandler: DriverEventHandler;

export const socketHandler = (io: Server) => {
  // Initialize driver event handler
  driverEventHandler = new DriverEventHandler(io);
  
  console.log('✅ Socket.io handlers initialized with driver tracking');
};

export const getDriverEventHandler = (): DriverEventHandler => {
  return driverEventHandler;
};