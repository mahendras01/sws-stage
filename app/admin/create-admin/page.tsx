"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import LoadingSpinner from "@/components/LoadingSpinner";

const districtScopedRoles = ["district_admin", "district_co_admin"] as const;

function validateAdminForm(form: {
  name: string;
  email: string;
  password: string;
  role: string;
  district: string;
  pincode: string;
}) {
  const errors: Record<string, string> = {};

  if (!form.name.trim() || form.name.trim().length < 3) {
    errors.name = "Full name must be at least 3 characters";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Valid email is required";
  }

  if (!form.password || form.password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  }

  if (districtScopedRoles.includes(form.role as (typeof districtScopedRoles)[number])) {
    if (!form.pincode || !/^\d{6}$/.test(form.pincode)) {
      errors.pincode = "PIN code must be exactly 6 digits";
    }

    if (!form.district.trim()) {
      errors.district = "District is required for district-level admin roles";
    }
  }

  return errors;
}

export default function CreateAdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [pincodeStatus, setPincodeStatus] = useState("");
  const [pincodeError, setPincodeError] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    id: "",
    name: "",
    email: "",
    password: "",
    role: "country_co_admin",
    district: "",
    district_id: "",
    pincode: "",
    country: "India",
    is_active: true,
  });

  const isSuperAdmin = session?.user?.role === "super_admin";
  const isDistrictRole = useMemo(
    () => districtScopedRoles.includes(form.role as (typeof districtScopedRoles)[number]),
    [form.role],
  );

  useEffect(() => {
    if (status !== "loading" && !isSuperAdmin) {
      router.push("/admin");
    }
  }, [status, isSuperAdmin, router]);

  async function handlePincodeLookup(nextPincode: string) {
    if (!isDistrictRole) {
      setPincodeStatus("");
      setPincodeError("");
      return { success: true, district: "", district_id: "" };
    }

    const normalized = nextPincode.replace(/\D/g, "").slice(0, 6);

    if (normalized.length !== 6) {
      setPincodeStatus("");
      setPincodeError("");
      return { success: false, district: "", district_id: "" };
    }

    setPincodeStatus("Checking district for this PIN code...");
    setPincodeError("");

    try {
      const res = await fetch(`/api/master-data?pincode=${normalized}`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.district) {
        const message = data.message || "Invalid PIN code or district not found in Uttar Pradesh.";
        setPincodeStatus("");
        setPincodeError(message);
        setForm((current) => ({ ...current, district: "", district_id: "" }));
        return { success: false, district: "", district_id: "" };
      }

      const district = data.district.district_name;
      const districtId = data.district.district_id ?? "";
      setPincodeStatus(`District matched: ${district}`);
      setPincodeError("");
      setForm((current) => ({
        ...current,
        district,
        district_id: districtId,
      }));

      return { success: true, district, district_id: districtId };
    } catch (error) {
      console.error(error);
      setPincodeStatus("");
      setPincodeError("Unable to verify this PIN code. Please try again.");
      setForm((current) => ({ ...current, district: "", district_id: "" }));
      return { success: false, district: "", district_id: "" };
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let resolvedForm = form;

    if (isDistrictRole && form.pincode) {
      const result = await handlePincodeLookup(form.pincode);
      if (!result.success) {
        return;
      }
      resolvedForm = {
        ...form,
        district: result.district,
        district_id: result.district_id,
      };
    }

    const validationErrors = validateAdminForm(resolvedForm);
    setFormErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const validDistrictId = resolvedForm.district_id && /^[0-9a-fA-F-]{36}$/.test(resolvedForm.district_id) ? resolvedForm.district_id : "";

    const payload = {
      ...resolvedForm,
      password: resolvedForm.password || undefined,
      district: isDistrictRole ? resolvedForm.district : "",
      district_id: isDistrictRole ? validDistrictId : "",
      pincode: isDistrictRole ? resolvedForm.pincode : "",
      country: resolvedForm.country?.trim() || "India",
      status: "approved",
    };

    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setForm({ id: "", name: "", email: "", password: "", role: "country_co_admin", district: "", district_id: "", pincode: "", country: "India", is_active: true });
        setPincodeStatus("");
        setPincodeError("");
        setFormErrors({});
        alert("Admin created successfully");
      } else {
        alert(data.message || "Failed to save admin");
      }
    } catch (e) {
      console.error(e);
      alert("Error creating admin");
    }
  }

  if (status === "loading") return <LoadingSpinner />;
  if (!isSuperAdmin) return null;

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Create Admin</h1>
        <p className="mt-1 text-sm text-gray-500">Add a country or district-level admin using the standard registration form layout.</p>
      </div>

      <form onSubmit={handleSubmit} className="mb-6 rounded border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
            <input
              placeholder="Enter full name"
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                setFormErrors((prev) => ({ ...prev, name: "" }));
              }}
              className="input"
            />
            {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                setFormErrors((prev) => ({ ...prev, email: "" }));
              }}
              className="input"
            />
            {formErrors.email && <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              placeholder="Use 8+ chars with uppercase, lowercase, number & symbol"
              value={form.password}
              onChange={(e) => {
                setForm({ ...form, password: e.target.value });
                setFormErrors((prev) => ({ ...prev, password: "" }));
              }}
              className="input"
            />
            {formErrors.password && <p className="mt-1 text-xs text-red-600">{formErrors.password}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Admin Type</label>
            <select
              value={form.role}
              onChange={(e) => {
                const nextRole = e.target.value;
                setForm({
                  ...form,
                  role: nextRole,
                  district: districtScopedRoles.includes(nextRole as (typeof districtScopedRoles)[number]) ? form.district : "",
                  district_id: districtScopedRoles.includes(nextRole as (typeof districtScopedRoles)[number]) ? form.district_id : "",
                  pincode: districtScopedRoles.includes(nextRole as (typeof districtScopedRoles)[number]) ? form.pincode : "",
                });
                setFormErrors((prev) => ({ ...prev, district: "", pincode: "" }));
                setPincodeStatus("");
                setPincodeError("");
              }}
              className="input"
            >
              <option value="country_co_admin">Country Co-Admin</option>
              <option value="district_admin">District Admin</option>
              <option value="district_co_admin">District Co-Admin</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Country</label>
            <input
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="input"
            />
          </div>

          {isDistrictRole && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">PIN Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter 6-digit PIN code"
                value={form.pincode}
                onChange={(e) => {
                  const nextValue = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setForm((current) => ({ ...current, pincode: nextValue }));
                  setFormErrors((prev) => ({ ...prev, pincode: "" }));
                  if (nextValue.length === 6) {
                    void handlePincodeLookup(nextValue);
                  } else {
                    setPincodeStatus("");
                    setPincodeError("");
                  }
                }}
                className="input"
              />
              {formErrors.pincode && <p className="mt-1 text-xs text-red-600">{formErrors.pincode}</p>}
            </div>
          )}
        </div>

        {isDistrictRole && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">District</label>
              <input
                value={form.district}
                readOnly
                placeholder="District auto-detected from PIN code"
                className="input bg-gray-50"
              />
              {formErrors.district && <p className="mt-1 text-xs text-red-600">{formErrors.district}</p>}
            </div>
            <input type="hidden" value={form.district_id} />
          </div>
        )}

        {isDistrictRole && (pincodeStatus || pincodeError) && (
          <p className={`mt-3 text-xs ${pincodeError ? "text-red-600" : "text-slate-500"}`}>{pincodeError || pincodeStatus}</p>
        )}

        <div className="mt-6 flex gap-3">
          <button type="submit" className="btn btn-primary">
            Create Admin
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setForm({ id: "", name: "", email: "", password: "", role: "country_co_admin", district: "", district_id: "", pincode: "", country: "India", is_active: true });
              setPincodeStatus("");
              setPincodeError("");
              setFormErrors({});
            }}
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}
