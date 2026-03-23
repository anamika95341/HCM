const DEFAULT_ALLOWED_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "xls",
  "xlsx",
  "doc",
  "docx",
  "txt",
];

const DEFAULT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const SUSPICIOUS_FILE_NAME_PATTERN = /[\\/\u0000-\u001F\u007F-\u009F]/;

function getFileExtension(name = "") {
  const parts = String(name).toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function getNormalizedFileName(name = "") {
  return String(name).normalize("NFC").trim();
}

function hasSafeFileName(name) {
  if (!name || name.length > 128) return false;
  if (name.startsWith(".") || name.endsWith(".") || name.endsWith(" ")) return false;
  if (SUSPICIOUS_FILE_NAME_PATTERN.test(name)) return false;
  return true;
}

function isAllowedFile(file, allowedExtensions, allowedMimeTypes, maxFileSizeBytes) {
  if (!(file instanceof File)) return false;
  const normalizedName = getNormalizedFileName(file.name);
  if (!hasSafeFileName(normalizedName) || file.size <= 0 || file.size > maxFileSizeBytes) return false;

  const extension = getFileExtension(normalizedName);
  const mimeType = String(file.type || "").toLowerCase();

  return allowedExtensions.includes(extension) && allowedMimeTypes.includes(mimeType);
}

export function sanitizeSelectedFiles(fileList, options = {}) {
  const {
    allowedExtensions = DEFAULT_ALLOWED_EXTENSIONS,
    allowedMimeTypes = DEFAULT_ALLOWED_MIME_TYPES,
    maxFileSizeBytes = 10 * 1024 * 1024,
    maxFiles = 5,
  } = options;

  const acceptedFiles = [];
  const rejectedFiles = [];
  const seenFiles = new Set();

  for (const file of Array.from(fileList || [])) {
    const normalizedName = getNormalizedFileName(file?.name);
    const fingerprint = `${normalizedName}:${file?.size}:${file?.lastModified}`;

    if (
      !seenFiles.has(fingerprint) &&
      acceptedFiles.length < maxFiles &&
      isAllowedFile(file, allowedExtensions, allowedMimeTypes, maxFileSizeBytes)
    ) {
      seenFiles.add(fingerprint);
      acceptedFiles.push(file);
    } else {
      rejectedFiles.push(file);
    }
  }

  return { acceptedFiles, rejectedFiles };
}
