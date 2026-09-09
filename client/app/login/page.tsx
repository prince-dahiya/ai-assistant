"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

const page = () => {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const { login, isLoading } = useAuth();

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    setError("");
    setSuccess("");
  };

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    // ================================================
    // FRONTEND VALIDATION
    // ================================================

    if (!formData.email || !formData.password) {
      setError(
        "Please enter your email and password."
      );
      return;
    }

    // ================================================
    // LOGIN
    // ================================================

    try {
      const loggedInUser = await login(
        formData.email.trim(),
        formData.password
      );

      // ================================================
      // ADMIN → ADMIN PAGE
      // ================================================

      if (
        loggedInUser?.role === "Administrator"
      ) {
        router.push("/admin");
        return;
      }

      // ================================================
      // OTHER USERS → NORMAL DASHBOARD
      // ================================================

      router.push("/dashboard");

    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;

      // ================================================
      // ACCOUNT LOCKED
      // ================================================

      if (status === 423) {
        setError(
          data?.message ||
            "Your account has been temporarily locked. Please try again later."
        );
        return;
      }

      // ================================================
      // EMAIL NOT VERIFIED
      // ================================================

      if (
        status === 403 &&
        data?.emailNotVerified
      ) {
        setError(
          "Please verify your email before logging in."
        );
        return;
      }

      // ================================================
      // PASSWORD EXPIRED
      // ================================================

      if (
        status === 403 &&
        data?.passwordExpired
      ) {
        setError(
          "Your password has expired. Please reset your password."
        );
        return;
      }

      // ================================================
      // WRONG PASSWORD
      // ================================================

      if (
        status === 401 &&
        data?.attemptsRemaining !== undefined
      ) {
        setError(
          `Invalid email or password. ${data.attemptsRemaining} login attempt(s) remaining.`
        );
        return;
      }

      // ================================================
      // INVALID CREDENTIALS
      // ================================================

      if (status === 401) {
        setError(
          data?.message ||
            "Invalid email or password. Please try again."
        );
        return;
      }

      // ================================================
      // OTHER BACKEND ERROR
      // ================================================

      if (data?.message) {
        setError(data.message);
        return;
      }

      // ================================================
      // NETWORK / TIMEOUT ERROR
      // ================================================

      if (err?.code === "ECONNABORTED") {
        setError(
          "The server took too long to respond. Please make sure the backend is running and try again."
        );
        return;
      }

      if (!err?.response) {
        setError(
          "Unable to connect to the server. Please make sure the backend is running."
        );
        return;
      }

      setError(
        "Unable to sign in. Please try again."
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary px-4 py-8">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">
              AI
            </span>
          </div>
        </div>

        <Card className="p-8 border border-border/50 shadow-lg">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2 text-center">
              Welcome Back
            </h1>

            <p className="text-center text-muted-foreground">
              Sign in to continue your interview practice
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg text-sm border border-destructive/20">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-6 p-4 bg-green-500/10 text-green-600 rounded-lg text-sm border border-green-500/20">
              {success}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold mb-2 text-foreground"
              >
                Email Address
              </label>

              <Input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                autoComplete="email"
                disabled={isLoading}
                className="rounded-lg"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold mb-2 text-foreground"
              >
                Password
              </label>

              <Input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                disabled={isLoading}
                className="rounded-lg"
              />
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-primary font-medium hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Login */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold rounded-full py-2 mt-2"
            >
              {isLoading
                ? "Signing In..."
                : "Sign In"}
            </Button>

          </form>

          {/* Register */}
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              Don&apos;t have an account?{" "}
            </span>

            <Link
              href="/register"
              className="text-primary font-semibold hover:underline"
            >
              Create one
            </Link>
          </div>

        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Protected by enterprise-grade security
        </p>

      </div>
    </div>
  );
};

export default page;