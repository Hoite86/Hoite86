const SESSION_WINDOW_MS = 5 * 60 * 1000;

let sessionId = '';
let expiresAt = 0;

const generateSessionId = (): string =>
  `sess_${Date.now()}_${Math.random().toString(16).slice(2, 12)}`;

export const rotateSessionId = (): string => {
  sessionId = generateSessionId();
  expiresAt = Date.now() + SESSION_WINDOW_MS;
  return sessionId;
};

export const getSessionId = (): string => {
  const now = Date.now();
  if (!sessionId || now >= expiresAt) {
    return rotateSessionId();
  }
  return sessionId;
};
