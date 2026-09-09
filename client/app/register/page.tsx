"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import React, { useState } from "react";

const Page = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const { register, isLoading } = useAuth();

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    // ===============================
    // FRONTEND VALIDATION
    // ===============================

    if (!formData.name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!formData.email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!formData.password) {
      setError("Please enter a password.");
      return;
    }

    if (formData.password.length < 8) {
      setError(
        "Password must be at least 8 characters long."
      );
      return;
    }

    if (!/[A-Z]/.test(formData.password)) {
      setError(
        "Password must contain at least one uppercase letter."
      );
      return;
    }

    if (!/[a-z]/.test(formData.password)) {
      setError(
        "Password must contain at least one lowercase letter."
      );
      return;
    }

    if (!/[0-9]/.test(formData.password)) {
      setError(
        "Password must contain at least one number."
      );
      return;
    }

    if (!/[^A-Za-z0-9]/.test(formData.password)) {
      setError(
        "Password must contain at least one special character."
      );
      return;
    }

    // ===============================
    // CREATE ACCOUNT
    // ===============================

    try {
      const data = await register(
        formData.name.trim(),
        formData.email.trim(),
        formData.password
      );

      // ===============================
      // REGISTRATION SUCCESS
      // ===============================

      setSuccess(
        data?.message ||
          "Account created successfully! Please check your email and click the verification link."
      );

      setFormData({
        name: "",
        email: "",
        password: "",
      });
    } catch (err: any) {
      console.error("Registration error:", err);

      const status = err?.response?.status;
      const message = err?.response?.data?.message;

      // ===============================
      // EMAIL ALREADY EXISTS
      // ===============================

      if (status === 409) {
        setError(
          "This email is already registered. Please sign in."
        );
        return;
      }

      // ===============================
      // VALIDATION ERROR
      // ===============================

      if (status === 400 && message) {
        setError(message);
        return;
      }

      // ===============================
      // OTHER BACKEND ERROR
      // ===============================

      if (message) {
        setError(message);
        return;
      }

      // ===============================
      // NETWORK / TIMEOUT ERROR
      // ===============================

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
        "Failed to create account. Please try again."
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
              Get Started
            </h1>

            <p className="text-center text-muted-foreground">
              Create your account to begin practicing
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

            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold mb-2 text-foreground"
              >
                Full Name
              </label>

              <Input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
                autoComplete="name"
                disabled={isLoading}
                className="rounded-lg"
              />
            </div>

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
                autoComplete="new-password"
                disabled={isLoading}
                className="rounded-lg"
              />

              <p className="text-xs text-muted-foreground mt-2">
                Must be at least 8 characters with uppercase,
                lowercase, number, and special character.
              </p>
            </div>

            {/* RBAC Information */}
            <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3">
              New accounts are registered as{" "}
              <span className="font-semibold text-foreground">
                Student
              </span>
              . Role access can be managed by an Administrator.
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold rounded-full py-2 mt-6"
            >
              {isLoading
                ? "Creating Account..."
                : "Sign Up"}
            </Button>
          </form>

          {/* Login */}
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              Already have an account?{" "}
            </span>

            <Link
              href="/login"
              className="text-primary font-semibold hover:underline"
            >
              Sign in
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

export default Page;