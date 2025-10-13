import { Server } from "socket.io";

export function setupSockets(httpServer: any) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*"
    }
  });

  io.on("connection", (socket) => {
    console.log("Socket conectado:", socket.id);
    socket.on("disconnect", () => console.log("Socket desconectado:", socket.id));
  });

  return io;
}
