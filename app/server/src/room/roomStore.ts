import type { Room } from "../types/types.js";

class RoomStore {
  private readonly rooms = new Map<string, Room>();

  get(code: unknown) {
    return this.rooms.get(String(code ?? "").toUpperCase());
  }

  has(code: string) {
    return this.rooms.has(code);
  }

  set(room: Room) {
    this.rooms.set(room.code, room);
  }

  delete(code: string) {
    this.rooms.delete(code);
  }

  values() {
    return this.rooms.values();
  }

  get size() {
    return this.rooms.size;
  }
}

export const roomStore = new RoomStore();
