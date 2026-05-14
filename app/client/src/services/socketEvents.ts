import { socket } from "../types/socket";

type AckResponse = {
  ok?: boolean;
  error?: string;
};

const ACK_TIMEOUT_MS = 5000;

export function emitWithAck<T extends AckResponse>(
  event: string,
  payload: unknown,
): Promise<T> {
  return new Promise((resolve) => {
    socket.timeout(ACK_TIMEOUT_MS).emit(event, payload, (error: Error | null, response: T) => {
      if (error) {
        resolve({
          ok: false,
          error: "Connexion trop lente. Reessaie dans quelques secondes.",
        } as T);
        return;
      }

      resolve(response);
    });
  });
}
