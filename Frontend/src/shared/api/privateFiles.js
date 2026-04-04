import { apiClient, authorizedConfig } from "./client.js";

const ROLE_MAX_SIZES = Object.freeze({
  citizen: Object.freeze({
    "application/pdf": 5 * 1024 * 1024,
    "image/jpeg": 5 * 1024 * 1024,
    "image/png": 5 * 1024 * 1024,
  }),
  deo: Object.freeze({
  "application/pdf": 5 * 1024 * 1024,
  "image/jpeg": 20 * 1024 * 1024,
  "image/png": 20 * 1024 * 1024,
  "video/mp4": 100 * 1024 * 1024,
  "video/mpeg": 100 * 1024 * 1024,
  "video/webm": 100 * 1024 * 1024,
  }),
});

const MIME_TO_UI_TYPE = Object.freeze({
  "application/pdf": "document",
  "image/jpeg": "photo",
  "image/png": "photo",
  "video/mp4": "video",
  "video/mpeg": "video",
  "video/webm": "video",
});

export const DEO_ACCEPT = ".pdf,image/jpeg,image/png,video/mp4,video/mpeg,video/webm";
export const CITIZEN_ACCEPT = ".pdf,image/jpeg,image/png";

export function getFileUiType(mimeType = "") {
  return MIME_TO_UI_TYPE[mimeType] || "document";
}

export function validatePrivateFile(file, role = "deo") {
  if (!(file instanceof File)) {
    throw new Error("Select a file to upload");
  }

  const maxSize = ROLE_MAX_SIZES[role]?.[file.type];
  if (!maxSize) {
    if (role === "citizen") {
      throw new Error("Only PDF, JPG, and PNG files are allowed");
    }
    throw new Error("Only PDF, JPG, PNG, MP4, MPEG, and WEBM files are allowed");
  }

  if (file.size > maxSize) {
    throw new Error(`File exceeds the ${(maxSize / (1024 * 1024)).toFixed(0)}MB limit`);
  }
}

export function validateDeoFile(file) {
  validatePrivateFile(file, "deo");
}

export function validateCitizenFile(file) {
  validatePrivateFile(file, "citizen");
}

export async function uploadPrivateFile({
  accessToken,
  file,
  contextType,
  contextId,
  role = "deo",
}) {
  validatePrivateFile(file, role);

  const { data: uploadData } = await apiClient.post(
    "/files/upload-url",
    {
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      contextType,
      contextId,
    },
    authorizedConfig(accessToken),
  );

  const uploadResponse = await fetch(uploadData.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error("Direct upload to storage failed");
  }

  const { data: confirmData } = await apiClient.post(
    "/files/confirm-upload",
    { s3Key: uploadData.s3Key },
    authorizedConfig(accessToken),
  );

  return confirmData.file;
}

export async function listVisibleFiles({ accessToken, contextType, contextId }) {
  const { data } = await apiClient.get(
    "/files",
    authorizedConfig(accessToken, {
      params: { contextType, contextId },
    }),
  );

  return Array.isArray(data.files) ? data.files : [];
}

export async function getDownloadUrl({ accessToken, fileId }) {
  const { data } = await apiClient.get(
    `/files/${fileId}/download`,
    authorizedConfig(accessToken),
  );

  return data.downloadUrl;
}
