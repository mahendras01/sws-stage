"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";

export default function LoginForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!identifier || !password) {
      setErrors({ form: "ईमेल/मोबाइल नंबर और पासवर्ड आवश्यक हैं" });
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: identifier,
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

        showToast("लॉगिन सफल", "success");
        router.push(isAdmin ? "/dashboard" : "/");
        router.refresh();
      }
    } catch {
      showToast("लॉगिन के दौरान कोई त्रुटि हुई", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card mx-auto w-full max-w-md space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">फिर से स्वागत है</h1>
        <p className="mt-1 text-sm text-neutral">अपने खाते में साइन इन करें</p>
      </div>

      {errors.form && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{errors.form}</div>
      )}

      <div>
        <label htmlFor="identifier" className="label-text">
          ईमेल या मोबाइल नंबर
        </label>
        <input
          id="identifier"
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="input-field"
          placeholder="you@example.com या 10 अंकों का मोबाइल नंबर"
          autoComplete="username"
        />
      </div>

      <div>
        <label htmlFor="password" className="label-text">
          पासवर्ड
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field pr-11"
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-3 flex items-center text-slate-500 transition hover:text-slate-700 focus:outline-none"
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                <path d="M3 3l18 18" strokeLinecap="round" />
                <path d="M10.58 10.58A2 2 0 0013.42 13.42" strokeLinecap="round" />
                <path d="M9.88 5.08A10.94 10.94 0 0112 5c4.5 0 8.24 2.5 10 7-1.02 2.22-2.54 4.02-4.45 5.15M6.61 6.61A15.1 15.1 0 002 12c1.76 4.5 5.5 7 10 7 1.59 0 3.09-.3 4.46-.86" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="3.2" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "साइन इन हो रहा है..." : "साइन इन"}
      </button>

      <p className="text-center text-sm text-neutral">
        क्या आपका खाता नहीं है?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          साइन अप करें
        </Link>
      </p>
    </form>
  );
}
