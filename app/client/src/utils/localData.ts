import { ACTIVE_SESSION_KEY, SESSION_PREFIX } from "../constants/game";
import { CONSENT_KEY } from "./consent";

export function clearLocalData(): void {
  try {
    Object.keys(localStorage)
      .filter(
        (key) =>
          key.startsWith(SESSION_PREFIX) ||
          key === ACTIVE_SESSION_KEY ||
          key === CONSENT_KEY,
      )
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    return;
  }
}
