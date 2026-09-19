"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";

export default function LoginForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!email || !password) {
      setErrors({ form: "Email and password are required" });
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        showToast(result.error, "error");
        setErrors({ form: result.error });
      } else {
        const sessionResponse = await fetch("/api/auth/session");
        const sessionData = await sessionResponse.json();
        const isAdmin = !!sessionData?.user?.is_admin;

        showToast("Login successful", "success");
        router.push(isAdmin ? "/dashboard" : "/");
        router.refresh();
      }
    } catch {
      showToast("An error occurred during login", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card mx-auto w-full max-w-md space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
        <p className="mt-1 text-sm text-neutral">Sign in to your account</p>
      </div>

      {errors.form && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{errors.form}</div>
      )}

      <div>
        <label htmlFor="email" className="label-text">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>

      <div>
        <label htmlFor="password" className="label-text">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Signing in..." : "Sign In"}
      </button>

      <div className="text-center text-sm text-neutral">
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">
          Forgot Password?
        </Link>
      </div>

      <p className="text-center text-sm text-neutral">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
