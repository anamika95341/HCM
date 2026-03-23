const CONTROL_AND_BIDI_CHARS = /[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g;

export function normalizeInputText(value, { maxLength = 500, trim = true } = {}) {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.normalize("NFC").replace(CONTROL_AND_BIDI_CHARS, "");
  const nextValue = trim ? normalized.trim() : normalized;
  return nextValue.slice(0, maxLength);
}

export function toSafeUserMessage(error, fallback = "Something went wrong") {
  const fieldErrors = error?.response?.data?.details?.fieldErrors;
  if (fieldErrors && typeof fieldErrors === "object") {
    const firstFieldError = Object.values(fieldErrors).flat().find((value) => typeof value === "string" && value.trim());
    if (firstFieldError) {
      return normalizeInputText(firstFieldError, { maxLength: 160 });
    }
  }

  const status = Number(error?.response?.status || 0);
  if (status >= 500) {
    return fallback;
  }

  const candidate = typeof error?.response?.data?.error === "string"
    ? error.response.data.error
    : typeof error?.message === "string"
      ? error.message
      : "";

  const cleaned = normalizeInputText(candidate, { maxLength: 160 });
  if (!cleaned) {
    return fallback;
  }

  const looksInternal = /(duplicate key|constraint|syntax error|postgres|sql|stack|exception|econn|jwt malformed|private key|public key|redis|timeout|sequelize|typeorm|prisma)/i.test(cleaned);
  return looksInternal ? fallback : cleaned;
}
