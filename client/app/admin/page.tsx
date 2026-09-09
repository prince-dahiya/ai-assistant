"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import { useAuth } from "@/hooks/useAuth";

type Role = "Student" | "Mentor" | "Administrator";

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
  isEmailVerified?: boolean;
  createdAt?: string;
}

export default function AdminPage() {
  const router = useRouter();

  const {
    user,
    isLoggedIn,
    isLoading: authLoading,
  } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"All" | Role>("All");

  /*
   * =========================================================
   * ADMIN ACCESS CHECK
   * =========================================================
   */
  useEffect(() => {
    if (authLoading) return;

    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }

    if (user?.role !== "Administrator") {
      router.replace("/dashboard");
    }
  }, [authLoading, isLoggedIn, user, router]);

  /*
   * =========================================================
   * FETCH USERS
   * =========================================================
   */
  const fetchUsers = async (showRefreshLoader = false) => {
    try {
      if (showRefreshLoader) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const { data } = await axiosInstance.get("/api/admin/users");

      setUsers(Array.isArray(data?.users) ? data.users : []);
    } catch (err: any) {
      console.error("Failed to fetch users:", err);

      const status = err?.response?.status;

      if (status === 401 || status === 403) {
        setError(
          "You do not have permission to access the administrator panel.",
        );

        if (status === 401) {
          router.replace("/login");
        } else {
          router.replace("/dashboard");
        }
      } else {
        setError(
          err?.response?.data?.message ||
            "Failed to load users. Please try again.",
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /*
   * =========================================================
   * LOAD USERS AFTER AUTHENTICATION
   * =========================================================
   */
  useEffect(() => {
    if (
      !authLoading &&
      isLoggedIn &&
      user?.role === "Administrator"
    ) {
      fetchUsers();
    }
  }, [authLoading, isLoggedIn, user?.role]);

  /*
   * =========================================================
   * CHANGE USER ROLE
   * =========================================================
   */
  const handleRoleChange = async (
    userId: string,
    role: Role,
  ) => {
    const selectedUser = users.find(
      (item) => item._id === userId,
    );

    if (!selectedUser) return;

    if (selectedUser.role === role) return;

    try {
      setUpdatingUser(userId);
      setMessage("");
      setError("");

      const { data } = await axiosInstance.patch(
        `/api/admin/users/${userId}/role`,
        {
          role,
        },
      );

      const updatedRole =
        data?.user?.role || role;

      setUsers((currentUsers) =>
        currentUsers.map((item) =>
          item._id === userId
            ? {
                ...item,
                role: updatedRole,
              }
            : item,
        ),
      );

      setMessage(
        data?.message ||
          `${selectedUser.name}'s role was updated successfully.`,
      );
    } catch (err: any) {
      console.error(
        "Failed to update role:",
        err,
      );

      setError(
        err?.response?.data?.message ||
          "Failed to update user role.",
      );
    } finally {
      setUpdatingUser(null);
    }
  };

  /*
   * =========================================================
   * FILTER USERS
   * =========================================================
   */
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((item) => {
      const matchesSearch =
        !query ||
        item.name?.toLowerCase().includes(query) ||
        item.email?.toLowerCase().includes(query);

      const matchesRole =
        roleFilter === "All" ||
        item.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  /*
   * =========================================================
   * STATISTICS
   * =========================================================
   */
  const statistics = useMemo(() => {
    return {
      total: users.length,

      students: users.filter(
        (item) => item.role === "Student",
      ).length,

      mentors: users.filter(
        (item) => item.role === "Mentor",
      ).length,

      administrators: users.filter(
        (item) => item.role === "Administrator",
      ).length,

      verified: users.filter(
        (item) => item.isEmailVerified,
      ).length,
    };
  }, [users]);

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */
  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-5">
            <div className="h-8 w-64 bg-muted rounded" />

            <div className="h-4 w-96 max-w-full bg-muted rounded" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="h-28 bg-muted rounded-2xl" />
              <div className="h-28 bg-muted rounded-2xl" />
              <div className="h-28 bg-muted rounded-2xl" />
            </div>

            <div className="h-96 bg-muted rounded-2xl" />
          </div>
        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * NOT ADMIN
   * =========================================================
   */
  if (!isLoggedIn || user?.role !== "Administrator") {
    return null;
  }

  /*
   * =========================================================
   * ADMIN PAGE
   * =========================================================
   */
  return (
    <main className="min-h-screen bg-background px-4 py-8 md:py-10">
      <div className="max-w-6xl mx-auto">

        {/* =====================================================
            HEADER
            ===================================================== */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">

            <div>
              <p className="text-sm text-primary font-semibold mb-2">
                🔐 Administrator Panel
              </p>

              <h1 className="text-3xl sm:text-4xl font-black text-foreground">
                User Management
              </h1>

              <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                Manage users and assign Student, Mentor,
                or Administrator roles.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  fetchUsers(true)
                }
                disabled={refreshing}
                className="px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-muted transition-colors text-sm font-semibold disabled:opacity-50"
              >
                {refreshing
                  ? "⏳ Refreshing..."
                  : "🔄 Refresh Users"}
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================
            MESSAGES
            ===================================================== */}
        {message && (
          <div className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
            ✅ {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            ⚠️ {error}
          </div>
        )}

        {/* =====================================================
            STATISTICS
            ===================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

          {/* Total */}
          <div className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Total Users
              </p>

              <span className="text-xl">
                👥
              </span>
            </div>

            <p className="text-3xl font-black mt-2">
              {statistics.total}
            </p>

            <p className="text-xs text-muted-foreground mt-1">
              All registered users
            </p>
          </div>

          {/* Students */}
          <div className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Students
              </p>

              <span className="text-xl">
                🎓
              </span>
            </div>

            <p className="text-3xl font-black mt-2">
              {statistics.students}
            </p>

            <p className="text-xs text-muted-foreground mt-1">
              Student accounts
            </p>
          </div>

          {/* Mentors */}
          <div className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mentors
              </p>

              <span className="text-xl">
                🧑‍🏫
              </span>
            </div>

            <p className="text-3xl font-black mt-2">
              {statistics.mentors}
            </p>

            <p className="text-xs text-muted-foreground mt-1">
              Mentor accounts
            </p>
          </div>

          {/* Administrators */}
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.03] p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Administrators
              </p>

              <span className="text-xl">
                🔐
              </span>
            </div>

            <p className="text-3xl font-black mt-2 text-primary">
              {statistics.administrators}
            </p>

            <p className="text-xs text-muted-foreground mt-1">
              Admin accounts
            </p>
          </div>
        </div>

        {/* =====================================================
            USER MANAGEMENT
            ===================================================== */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">

          {/* Header */}
          <div className="px-5 py-5 border-b border-border">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

              <div>
                <h2 className="text-lg font-black">
                  All Users
                </h2>

                <p className="text-sm text-muted-foreground mt-1">
                  Search users and change their roles.
                </p>
              </div>

              <div className="text-xs text-muted-foreground">
                Showing{" "}
                <span className="font-bold text-foreground">
                  {filteredUsers.length}
                </span>{" "}
                of{" "}
                <span className="font-bold text-foreground">
                  {users.length}
                </span>{" "}
                users
              </div>
            </div>

            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mt-5">

              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  🔍
                </span>

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search by name or email..."
                  className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(
                    e.target.value as
                      | "All"
                      | Role,
                  )
                }
                className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="All">
                  All Roles
                </option>

                <option value="Student">
                  Students
                </option>

                <option value="Mentor">
                  Mentors
                </option>

                <option value="Administrator">
                  Administrators
                </option>
              </select>
            </div>
          </div>

          {/* Empty state */}
          {users.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">
                👥
              </div>

              <p className="font-bold text-lg">
                No users found
              </p>

              <p className="text-sm text-muted-foreground mt-1">
                There are currently no users in the database.
              </p>

              <button
                onClick={() =>
                  fetchUsers(true)
                }
                className="mt-5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
              >
                🔄 Refresh
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">
                🔍
              </div>

              <p className="font-semibold">
                No matching users
              </p>

              <p className="text-sm text-muted-foreground mt-1">
                Try a different name, email, or role.
              </p>

              <button
                onClick={() => {
                  setSearch("");
                  setRoleFilter("All");
                }}
                className="mt-4 text-sm text-primary font-semibold hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">

                {/* Table Header */}
                <thead>
                  <tr className="border-b border-border bg-muted/30">

                    <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground">
                      User
                    </th>

                    <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground">
                      Email
                    </th>

                    <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground">
                      Verification
                    </th>

                    <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground">
                      Role
                    </th>

                    <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground">
                      Joined
                    </th>

                    <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground">
                      Action
                    </th>

                  </tr>
                </thead>

                {/* Table Body */}
                <tbody>
                  {filteredUsers.map((item) => {
                    const isCurrentUser =
                      item._id === user?.id ||
                      item._id ===
                        (user as any)?._id;

                    const isUpdating =
                      updatingUser ===
                      item._id;

                    return (
                      <tr
                        key={item._id}
                        className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                          isCurrentUser
                            ? "bg-primary/[0.02]"
                            : ""
                        }`}
                      >

                        {/* User */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">

                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-black flex-shrink-0">
                              {item.name
                                ?.charAt(0)
                                .toUpperCase() ||
                                "U"}
                            </div>

                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate max-w-[180px]">
                                {item.name ||
                                  "Unknown User"}
                              </p>

                              {isCurrentUser && (
                                <span className="text-xs text-primary font-semibold">
                                  You
                                </span>
                              )}
                            </div>

                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-5 py-4">
                          <p className="text-sm text-muted-foreground">
                            {item.email}
                          </p>
                        </td>

                        {/* Verification */}
                        <td className="px-5 py-4">
                          {item.isEmailVerified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                              ✓ Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                              ⏳ Pending
                            </span>
                          )}
                        </td>

                        {/* Role */}
                        <td className="px-5 py-4">
                          <select
                            value={item.role}
                            disabled={
                              isCurrentUser ||
                              isUpdating
                            }
                            onChange={(event) =>
                              handleRoleChange(
                                item._id,
                                event.target
                                  .value as Role,
                              )
                            }
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="Student">
                              Student
                            </option>

                            <option value="Mentor">
                              Mentor
                            </option>

                            <option value="Administrator">
                              Administrator
                            </option>
                          </select>
                        </td>

                        {/* Joined */}
                        <td className="px-5 py-4">
                          <p className="text-xs text-muted-foreground">
                            {item.createdAt
                              ? new Date(
                                  item.createdAt,
                                ).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )
                              : "—"}
                          </p>
                        </td>

                        {/* Action */}
                        <td className="px-5 py-4">
                          {isCurrentUser ? (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                              Current account
                            </span>
                          ) : isUpdating ? (
                            <span className="text-xs text-primary font-semibold">
                              Updating...
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Select a role
                            </span>
                          )}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>

              </table>
            </div>
          )}
        </div>

        {/* =====================================================
            ADMIN INFO
            ===================================================== */}
        <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/[0.03] p-5">
          <div className="flex gap-3">

            <div className="text-xl">
              🛡️
            </div>

            <div>
              <p className="text-sm font-bold">
                Administrator privileges
              </p>

              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                You can manage user roles from this page.
                Your own Administrator role cannot be changed
                from the panel to prevent accidental lockout.
              </p>
            </div>

          </div>
        </div>

      </div>
    </main>
  );
}