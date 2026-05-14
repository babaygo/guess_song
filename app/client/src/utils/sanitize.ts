export function sanitizeName(value: string) {
  return value.trim().replace(/[<>&"']/g, "").slice(0, 20);
}

export function sanitizeCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}
