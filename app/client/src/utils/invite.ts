import { sanitizeCode } from "./sanitize";

const INVITE_PARAM = "code";

export function parseInviteCode(search: string): string {
  const raw = new URLSearchParams(search).get(INVITE_PARAM) ?? "";
  const code = sanitizeCode(raw);
  return code.length === 6 ? code : "";
}

export function buildInviteUrl(origin: string, pathname: string, code: string): string {
  return `${origin}${pathname}?${INVITE_PARAM}=${encodeURIComponent(code)}`;
}

export function readInviteCode(): string {
  if (typeof window === "undefined") return "";
  return parseInviteCode(window.location.search);
}

export function currentInviteUrl(code: string): string {
  if (typeof window === "undefined") return "";
  return buildInviteUrl(window.location.origin, window.location.pathname, code);
}
