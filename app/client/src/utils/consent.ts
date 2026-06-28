export const CONSENT_KEY = "guess-song-consent";

export type ConsentCategory = "measurement";

export type ConsentChoice = {
  measurement: boolean;
  ts: number;
};

export function getConsent(): ConsentChoice | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentChoice>;
    if (typeof parsed.measurement !== "boolean" || typeof parsed.ts !== "number") {
      return null;
    }
    return { measurement: parsed.measurement, ts: parsed.ts };
  } catch {
    return null;
  }
}

export function setConsent(measurement: boolean): ConsentChoice {
  const choice: ConsentChoice = { measurement, ts: Date.now() };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(choice));
  } catch {
    return choice;
  }
  return choice;
}

export function hasConsent(category: ConsentCategory): boolean {
  return Boolean(getConsent()?.[category]);
}

export function openConsent(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("guess-song-consent-open"));
}
