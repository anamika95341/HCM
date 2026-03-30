import axios from "axios";
import { API_BASE_URL } from "../config/env.js";

let unauthorizedHandler = null;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

function looksLikeHtmlDocument(payload) {
  return typeof payload === "string" && /^\s*<(!DOCTYPE|html)\b/i.test(payload);
}

apiClient.interceptors.response.use(
  (response) => {
    const cfg = response.config || {};
    if (cfg.responseType && cfg.responseType !== "json") {
      return response;
    }
    if (looksLikeHtmlDocument(response.data)) {
      return Promise.reject(
        new Error(
          "Received HTML instead of JSON from the API. Check VITE_API_BASE_URL, reverse-proxy /api routing, or API_UPSTREAM on the static server (same-origin /api must reach the backend).",
        ),
      );
    }
    return response;
  },
  async (error) => {
    const authHeader = error?.config?.headers?.Authorization || error?.config?.headers?.authorization;
    if (error?.response?.status === 401 && authHeader && typeof unauthorizedHandler === "function") {
      unauthorizedHandler(error);
    }
    return Promise.reject(error);
  }
);

function isUsableToken(accessToken) {
  return typeof accessToken === "string" && accessToken.trim().length > 20;
}

export function authorizedConfig(accessToken, extra = {}) {
  const headers = {
    ...(extra.headers || {}),
  };

  if (isUsableToken(accessToken)) {
    headers.Authorization = `Bearer ${accessToken.trim()}`;
  }

  return {
    ...extra,
    headers,
  };
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}
