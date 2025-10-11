import { Server } from "socket.io";

export function attachSockets(server: any) {
  const io = new Server(server, {
    cors: { origin: process.env.CORS_ORIGIN || "*" }
  });

  io.on("connection", (socket) => {
    socket.on("join-track", (ref: string) => socket.join(ref));
  });

  // función utilitaria para emitir ubicación por ref_code
  const emitLocation = (ref: string, payload: any) => {
    io.to(ref).emit(`loc:${ref}`, payload);
  };

  return { io, emitLocation };
}
