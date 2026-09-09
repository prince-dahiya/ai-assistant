"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import axiosInstance from "@/lib/axios";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");

  const [status, setStatus] = useState<
    "loading" | "success" | "error"
  >("loading");

  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Verification token is missing.");
        return;
      }

      try {
        console.log("Verification token:", token);

        const response = await axiosInstance.get(
          `/api/auth/verify-email/${token}`
        );

        console.log(
          "Verification response:",
          response.data
        );

        setStatus("success");

        setMessage(
          response.data?.message ||
            "Email verified successfully."
        );

        // =========================================
        // REDIRECT TO LOGIN AFTER 2 SECONDS
        // =========================================

        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } catch (err: any) {
        console.error(
          "Email verification failed:",
          err
        );

        console.error(
          "Status:",
          err?.response?.status
        );

        console.error(
          "Response:",
          err?.response?.data
        );

        setStatus("error");

        setMessage(
          err?.response?.data?.message ||
            "Invalid or expired verification token."
        );
      }
    };

    verifyEmail();
  }, [token, router]);

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

          {/* LOADING */}
          {status === "loading" && (
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground mb-3">
                Verifying Email
              </h1>

              <p className="text-muted-foreground">
                Please wait while we verify your email
                address...
              </p>

              <div className="mt-6 flex justify-center">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            </div>
          )}

          {/* SUCCESS */}
          {status === "success" && (
            <div className="text-center">

              <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                <span className="text-2xl text-green-600">
                  ✓
                </span>
              </div>

              <h1 className="text-3xl font-bold text-foreground mb-3">
                Email Verified!
              </h1>

              <p className="text-muted-foreground mb-4">
                {message}
              </p>

              <p className="text-sm text-muted-foreground mb-6">
                Redirecting you to login...
              </p>

              <Link href="/login">
                <Button className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold rounded-full">
                  Continue to Login
                </Button>
              </Link>

            </div>
          )}

          {/* ERROR */}
          {status === "error" && (
            <div className="text-center">

              <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <span className="text-2xl text-destructive">
                  ✕
                </span>
              </div>

              <h1 className="text-3xl font-bold text-foreground mb-3">
                Verification Failed
              </h1>

              <p className="text-muted-foreground mb-6">
                {message}
              </p>

              <Link href="/login">
                <Button className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold rounded-full">
                  Go to Login
                </Button>
              </Link>

            </div>
          )}

        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Protected by enterprise-grade security
        </p>

      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Verifying email...
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}