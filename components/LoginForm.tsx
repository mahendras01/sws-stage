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
