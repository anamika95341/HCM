import axios from "axios";
import { API_BASE_URL } from "../config/env.js";

let unauthorizedHandler = null;
let refreshHandler = null;
let isRefreshing = false;
let pendingQueue = [];

function drainQueue(error, token) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
}

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
    const originalRequest = error?.config;
    const authHeader = originalRequest?.headers?.Authorization || originalRequest?.headers?.authorization;

    if (error?.response?.status === 401 && authHeader && !originalRequest?._retried) {
      if (typeof refreshHandler === "function") {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            pendingQueue.push({ resolve, reject });
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          });
        }

        originalRequest._retried = true;
        isRefreshing = true;

        try {
          const newToken = await refreshHandler();
          drainQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          drainQueue(refreshError, null);
          if (typeof unauthorizedHandler === "function") {
            unauthorizedHandler();
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      if (typeof unauthorizedHandler === "function") {
        unauthorizedHandler();
      }
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

export function setRefreshHandler(handler) {
  refreshHandler = handler;
}
