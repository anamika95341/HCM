import { API_BASE_URL } from "../config/env.js";

function getApiOrigin() {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, "");
}

export function resolveDownloadUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return new URL(url, `${getApiOrigin()}/`).toString();
}

export function openDownloadUrl(url) {
  const resolved = resolveDownloadUrl(url);
  if (!resolved) return;
  window.open(resolved, "_blank", "noopener,noreferrer");
}
