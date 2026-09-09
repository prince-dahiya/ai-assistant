"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import {
  clearAuth,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
  StoredUser,
} from "@/lib/auth";

interface AuthContextValue {
  user: StoredUser | null;
  token: string | null;
  isLoading: boolean;
  isLoggedIn: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<StoredUser>;

  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<{
    message: string;
    user?: StoredUser;
  }>;

  logout: () => void;
  refreshUser: () => Promise<void>;

  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

export const AuthContext =
  createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [user, setUser] =
    useState<StoredUser | null>(null);

  const [token, setTokenState] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  // =====================================================
  // RESTORE AUTHENTICATION
  // =====================================================

  useEffect(() => {
    const storedToken = getToken();
    const storedUser = getStoredUser();

    if (storedToken && storedUser) {
      setTokenState(storedToken);
      setUser(storedUser);

      axiosInstance.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${storedToken}`;
    }

    setIsLoading(false);
  }, []);

  // =====================================================
  // LOGIN
  // =====================================================

  const login = useCallback(
    async (
      email: string,
      password: string
    ): Promise<StoredUser> => {
      setIsLoading(true);

      try {
        const { data } =
          await axiosInstance.post(
            "/api/auth/login",
            {
              email,
              password,
            }
          );

        console.log(
          "LOGIN RESPONSE:",
          data
        );

        // =================================================
        // STORE TOKEN
        // =================================================

        setToken(data.token);
        setTokenState(data.token);

        axiosInstance.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${data.token}`;

        // =================================================
        // STORE USER
        // =================================================

        setStoredUser(data.user);
        setUser(data.user);

        console.log(
          "Logged in user:",
          data.user
        );

        console.log(
          "User role:",
          data.user?.role
        );

        // =================================================
        // IMPORTANT:
        // DO NOT REDIRECT HERE.
        //
        // The LOGIN PAGE decides:
        // Administrator → /admin
        // Student/Mentor → /dashboard
        // =================================================

        return data.user;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // =====================================================
  // REGISTER
  // =====================================================

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string
    ) => {
      setIsLoading(true);

      try {
        const { data } =
          await axiosInstance.post(
            "/api/auth/register",
            {
              name,
              email,
              password,
            }
          );

        console.log(
          "REGISTER RESPONSE:",
          data
        );

        return {
          message:
            data?.message ||
            "Account created successfully. Please check your email.",
          user: data?.user,
        };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = useCallback(() => {
    clearAuth();

    setTokenState(null);
    setUser(null);

    delete axiosInstance.defaults.headers.common[
      "Authorization"
    ];

    router.push("/");
  }, [router]);

  // =====================================================
  // REFRESH CURRENT USER
  // =====================================================

  const refreshUser = useCallback(
    async () => {
      try {
        const { data } =
          await axiosInstance.get(
            "/api/auth/me"
          );

        setStoredUser(data.user);
        setUser(data.user);

        console.log(
          "CURRENT USER:",
          data.user
        );

        console.log(
          "CURRENT USER ROLE:",
          data.user?.role
        );
      } catch (error) {
        console.error(
          "Refresh user error:",
          error
        );

        clearAuth();

        setTokenState(null);
        setUser(null);

        delete axiosInstance.defaults.headers.common[
          "Authorization"
        ];

        router.push("/login");
      }
    },
    [router]
  );

  // =====================================================
  // ROLE CHECKING
  // =====================================================

  const hasRole = useCallback(
    (role: string) => {
      if (!user?.role) {
        return false;
      }

      return user.role === role;
    },
    [user]
  );

  const hasAnyRole = useCallback(
    (roles: string[]) => {
      if (!user?.role) {
        return false;
      }

      return roles.includes(user.role);
    },
    [user]
  );

  // =====================================================
  // CONTEXT VALUE
  // =====================================================

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isLoggedIn: !!token && !!user,

      login,
      register,
      logout,
      refreshUser,

      hasRole,
      hasAnyRole,
    }),
    [
      user,
      token,
      isLoading,
      login,
      register,
      logout,
      refreshUser,
      hasRole,
      hasAnyRole,
    ]
  );

  // =====================================================
  // PROVIDER
  // =====================================================

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}