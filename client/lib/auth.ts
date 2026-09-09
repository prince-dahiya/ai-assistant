const TOKEN_KEY = "token";
const USER_KEY = "user";

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: "Student" | "Mentor" | "Administrator";
  isEmailVerified?: boolean;
}

// =====================================================
// TOKEN
// =====================================================

export const getToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
};

// =====================================================
// USER
// =====================================================

export const getStoredUser = (): StoredUser | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(USER_KEY);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
};

export const setStoredUser = (
  user: StoredUser
): void => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    USER_KEY,
    JSON.stringify(user)
  );
};

export const removeStoredUser = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(USER_KEY);
};

// =====================================================
// CLEAR AUTH
// =====================================================

export const clearAuth = (): void => {
  removeToken();
  removeStoredUser();
};

// =====================================================
// AUTH CHECK
// =====================================================

export const isAuthenticated = (): boolean => {
  return !!getToken();
};