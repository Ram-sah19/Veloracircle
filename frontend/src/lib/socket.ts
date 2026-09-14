import { io, Socket } from "socket.io-client";
import { getStoredAuth } from "@/lib/mock-data";

let globalSocket: Socket | null = null;
let currentToken: string | null = null;

const SOCKET_SERVER_URL = "http://localhost:5000";

/**
 * Get or initialize the persistent application-wide socket connection.
 * Only connects if the user is authenticated (token is present).
 */
export function getSocket(forceAuthToken?: string): Socket | null {
  const token = forceAuthToken || getStoredAuth().token;

  // If no token is available (user logged out), do not establish socket
  if (!token) {
    if (globalSocket) {
      disconnectSocket();
    }
    return null;
  }

  // If socket already exists and token has not changed, reuse existing connection
  if (globalSocket && currentToken === token && (globalSocket.connected || globalSocket.active)) {
    return globalSocket;
  }

  // If token changed or socket was disconnected, clean up previous
  if (globalSocket) {
    try {
      globalSocket.disconnect();
    } catch {
      // ignore
    }
    globalSocket = null;
  }

  currentToken = token;
  globalSocket = io(SOCKET_SERVER_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return globalSocket;
}

/**
 * Disconnect and destroy the global socket (e.g. on user logout or tab close).
 */
export function disconnectSocket() {
  if (globalSocket) {
    try {
      globalSocket.disconnect();
    } catch {
      // ignore
    }
    globalSocket = null;
    currentToken = null;
  }
}

// Auto-manage socket lifecycle across the application
if (typeof window !== "undefined") {
  // Disconnect cleanly when user closes tab or refreshes
  window.addEventListener("beforeunload", () => {
    disconnectSocket();
  });

  // Listen to login/logout auth events
  window.addEventListener("velora_auth_changed", (e) => {
    const detail = (e as CustomEvent).detail;
    if (detail && detail.token) {
      // User logged in: activate socket
      getSocket(detail.token);
    } else {
      // User logged out: disconnect socket
      disconnectSocket();
    }
  });

  // If already authenticated on script load, activate socket
  const initial = getStoredAuth();
  if (initial && initial.token) {
    getSocket(initial.token);
  }
}
