const IMAGE_PROTOCOLS = new Set(["http:", "https:"]);
const DISALLOWED_URL_CHARS = /[\u0000-\u001F\u007F-\u009F\s]/;

export function sanitizeImageSrc(value) {
  if (typeof value !== "string") return null;

  const trimmed = value.normalize("NFC").trim();
  if (!trimmed || trimmed.startsWith("//") || DISALLOWED_URL_CHARS.test(trimmed)) return null;

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed, window.location.origin);
    return IMAGE_PROTOCOLS.has(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}
