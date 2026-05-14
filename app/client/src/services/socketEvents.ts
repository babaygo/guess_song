import { socket } from "../types/socket";

export function emitWithAck<T>(event: string, payload: unknown): Promise<T> {
  return new Promise((resolve) => {
    socket.emit(event, payload, (response: T) => resolve(response));
  });
}
