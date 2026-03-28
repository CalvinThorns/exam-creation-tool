const AUTH_TOKEN_STORAGE_KEY = "exam-creation-tool.auth.token";
const AUTH_USER_STORAGE_KEY = "exam-creation-tool.auth.user";

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
}

export function getAuthUser() {
  const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getAuthDisplayName() {
  const user = getAuthUser();
  if (!user) return "";

  const firstName = String(user.firstName || "").trim();
  const lastName = String(user.lastName || "").trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (fullName) return fullName;
  return String(user.email || "").trim();
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}

export function saveAuthSession({ accessToken, user }) {
  if (accessToken) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, accessToken);
  }

  if (user) {
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
  }
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}
