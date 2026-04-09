import axios from "axios";
import { API_BASE_URL } from "../config/env.js";

let unauthorizedHandler = null;
let refreshHandler = null;
let isRefreshing = false;
let pendingQueue = [];

function drainQueue(error) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  pendingQueue = [];
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
});

// Auth endpoints that should NOT trigger the refresh flow on 401
const AUTH_ENDPOINTS = [
  "/auth/citizen/login",
  "/auth/admin/login",
  "/auth/masteradmin/login",
  "/auth/deo/login",
  "/auth/minister/login",
  "/auth/token/refresh",
  "/auth/session",
  "/auth/citizen/register",
  "/auth/citizen/verify-account",
  "/auth/citizen/forgot-password",
  "/auth/citizen/reset-password",
  "/auth/admin/verify-account",
  "/auth/admin/resend-verification-code",
  "/auth/deo/verify-account",
  "/auth/deo/resend-verification-code",
];

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
    const isAuthEndpoint = AUTH_ENDPOINTS.some((path) =>
      originalRequest?.url?.includes(path),
    );

    if (
      error?.response?.status === 401 &&
      !originalRequest?._retried &&
      !isAuthEndpoint
    ) {
      if (typeof refreshHandler === "function") {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            pendingQueue.push({ resolve, reject });
          }).then(() => apiClient(originalRequest));
        }

        originalRequest._retried = true;
        isRefreshing = true;

        try {
          await refreshHandler();
          drainQueue(null);
          return apiClient(originalRequest);
        } catch (refreshError) {
          drainQueue(refreshError);
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
  },
);

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export function setRefreshHandler(handler) {
  refreshHandler = handler;
}
