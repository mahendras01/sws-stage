"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import LoadingSpinner from "@/components/LoadingSpinner";

const districtScopedRoles = ["district_admin", "district_co_admin"] as const;
const countryLevelRole = "country_co_admin" as const;

type LookupUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone_number: string | null;
  role: string | null;
  district: string | null;
  is_admin: boolean;
  status: string | null;
};

function validateAdminForm(form: {
  name: string;
  email: string;
  password: string;
  role: string;
  district: string;
  pincode: string;
  selectedUserId?: string;
}) {
  const errors: Record<string, string> = {};
  const isCountryRole = form.role === countryLevelRole;

  if (isCountryRole && !form.selectedUserId) {
    errors.selectedUser = "Select an existing registered user first";
  }

  if (!isCountryRole && (!form.name.trim() || form.name.trim().length < 3)) {
    errors.name = "Full name must be at least 3 characters";
  }

  if (!isCountryRole && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Valid email is required";
  }

  if (!isCountryRole && (!form.password || form.password.length < 8)) {
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
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResults, setLookupResults] = useState<LookupUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<LookupUser | null>(null);
  const [lookupMessage, setLookupMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitMessage, setSubmitMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
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
  const isCountryRole = form.role === countryLevelRole;

  const resetForm = () => {
    setForm({ id: "", name: "", email: "", password: "", role: "country_co_admin", district: "", district_id: "", pincode: "", country: "India", is_active: true });
    setSelectedUser(null);
    setLookupQuery("");
    setLookupResults([]);
    setLookupMessage(null);
    setSubmitMessage(null);
    setPincodeStatus("");
    setPincodeError("");
    setFormErrors({});
  };

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

  const handleUserLookup = useCallback(async (lookupValue?: string) => {
    const query = (lookupValue ?? lookupQuery).trim();
    if (!query) {
      setLookupResults([]);
      setLookupMessage(null);
      return;
    }

    setSubmitMessage(null);
    setLookupLoading(true);
    try {
      const res = await fetch(`/api/admin/admins?lookup=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        const users = Array.isArray(data.users) ? data.users : [];
        setLookupResults(users);
        setLookupMessage(
          users.length > 0
            ? { type: "success", text: `Found ${users.length} matching user${users.length > 1 ? "s" : ""}. Select one to review details.` }
            : { type: "error", text: "No matching user found. Please check the email or mobile number." },
        );
      } else {
        setLookupResults([]);
        setLookupMessage({ type: "error", text: data?.message || "User lookup failed." });
      }
    } catch (error) {
      console.error(error);
      setLookupResults([]);
      setLookupMessage({ type: "error", text: "Unable to search users right now. Please try again." });
    } finally {
      setLookupLoading(false);
    }
  }, [lookupQuery]);

  useEffect(() => {
    if (!isCountryRole) return;

    const query = lookupQuery.trim();
    if (!query) {
      setLookupResults([]);
      setLookupMessage(null);
      return;
    }

    const timer = setTimeout(() => {
      void handleUserLookup(query);
    }, 350);

    return () => clearTimeout(timer);
  }, [lookupQuery, isCountryRole, handleUserLookup]);

  function handleSelectUser(user: LookupUser) {
    setSelectedUser(user);
    setForm((current) => ({
      ...current,
      id: user.id,
      name: user.name ?? "",
      email: user.email ?? "",
      password: "",
    }));
    setLookupResults([]);
    setLookupQuery(user.email || user.phone_number || "");
    setLookupMessage({ type: "success", text: "User selected. Review details before assigning Country Co-Admin role." });
    setSubmitMessage(null);
    setFormErrors((prev) => ({ ...prev, selectedUser: "" }));
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

    const validationErrors = validateAdminForm({
      ...resolvedForm,
      selectedUserId: selectedUser?.id,
    });
    setFormErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    if (isCountryRole && selectedUser) {
      const confirmed = window.confirm(`Assign Country Co-Admin role to ${selectedUser.name || selectedUser.email || "this user"}?`);
      if (!confirmed) {
        return;
      }
    }

    const validDistrictId = resolvedForm.district_id && /^[0-9a-fA-F-]{36}$/.test(resolvedForm.district_id) ? resolvedForm.district_id : "";

    const payload = isCountryRole
      ? {
          role: resolvedForm.role,
          selected_user_id: selectedUser?.id,
          country: resolvedForm.country?.trim() || "India",
          is_active: resolvedForm.is_active,
          status: "approved",
        }
      : {
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
        setSubmitMessage({ type: "success", text: isCountryRole ? "Country Co-Admin assigned successfully." : "Admin created successfully." });
        setForm((current) => ({
          ...current,
          id: "",
          name: "",
          email: "",
          password: "",
          district: "",
          district_id: "",
          pincode: "",
        }));
        if (isCountryRole) {
          setSelectedUser(null);
          setLookupResults([]);
          setLookupQuery("");
          setLookupMessage(null);
        }
      } else {
        setSubmitMessage({ type: "error", text: data.message || "Failed to save admin" });
      }
    } catch (err) {
      console.error(err);
      setSubmitMessage({ type: "error", text: "Error creating admin" });
    }
  }

  if (status === "loading") return <LoadingSpinner />;
  if (!isSuperAdmin) return null;

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Create Admin</h1>
        <p className="mt-1 text-sm text-gray-500">Assign country or district-level admin roles.</p>
      </div>

      {submitMessage && (
        <div className={`mb-4 rounded border px-3 py-2 text-sm ${submitMessage.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {submitMessage.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mb-6 rounded border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          {!isCountryRole && (
            <>
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
            </>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Admin Type</label>
            <select
              value={form.role}
              onChange={(e) => {
                const nextRole = e.target.value;
                setForm((current) => ({
                  ...current,
                  role: nextRole,
                  id: districtScopedRoles.includes(nextRole as (typeof districtScopedRoles)[number]) ? current.id : "",
                  name: districtScopedRoles.includes(nextRole as (typeof districtScopedRoles)[number]) ? current.name : "",
                  email: districtScopedRoles.includes(nextRole as (typeof districtScopedRoles)[number]) ? current.email : "",
                  password: districtScopedRoles.includes(nextRole as (typeof districtScopedRoles)[number]) ? current.password : "",
                  district: districtScopedRoles.includes(nextRole as (typeof districtScopedRoles)[number]) ? current.district : "",
                  district_id: districtScopedRoles.includes(nextRole as (typeof districtScopedRoles)[number]) ? current.district_id : "",
                  pincode: districtScopedRoles.includes(nextRole as (typeof districtScopedRoles)[number]) ? current.pincode : "",
                }));
                if (nextRole === countryLevelRole) {
                  setSelectedUser(null);
                  setLookupQuery("");
                  setLookupResults([]);
                }
                setFormErrors((prev) => ({ ...prev, district: "", pincode: "", selectedUser: "" }));
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

          {isCountryRole && (
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Find Existing User (Email or Mobile Number)</label>
              <div className="flex gap-2">
                <input
                  placeholder="Search by email or 10-digit mobile"
                  value={lookupQuery}
                  onChange={(e) => {
                    setLookupQuery(e.target.value);
                    setSelectedUser(null);
                    setSubmitMessage(null);
                  }}
                  className="input"
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void handleUserLookup()}
                  disabled={lookupLoading}
                >
                  {lookupLoading ? "Searching..." : "Search"}
                </button>
              </div>
              {formErrors.selectedUser && <p className="mt-1 text-xs text-red-600">{formErrors.selectedUser}</p>}

              {lookupMessage && (
                <p className={`mt-2 text-xs ${lookupMessage.type === "success" ? "text-emerald-700" : "text-red-600"}`}>
                  {lookupMessage.text}
                </p>
              )}

              {lookupResults.length > 0 && (
                <div className="mt-2 max-h-60 overflow-auto rounded border border-gray-200">
                  {lookupResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="flex w-full items-center justify-between border-b border-gray-100 px-3 py-2 text-left last:border-b-0 hover:bg-gray-50"
                      onClick={() => handleSelectUser(user)}
                    >
                      <span className="text-sm text-gray-800">{user.name || "Unnamed User"}</span>
                      <span className="text-xs text-gray-500">{user.email || "-"} | {user.phone_number || "-"}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedUser && (
                <div className="mt-3 grid gap-3 rounded border border-slate-200 bg-slate-50 p-3 md:grid-cols-5">
                  <div>
                    <p className="text-xs text-slate-500">Name</p>
                    <p className="text-sm font-medium text-slate-800">{selectedUser.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="text-sm font-medium text-slate-800">{selectedUser.email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Mobile Number</p>
                    <p className="text-sm font-medium text-slate-800">{selectedUser.phone_number || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Current Role</p>
                    <p className="text-sm font-medium text-slate-800">{selectedUser.role || "user"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">District</p>
                    <p className="text-sm font-medium text-slate-800">{selectedUser.district || "-"}</p>
                  </div>
                </div>
              )}
            </div>
          )}

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
          {(!isCountryRole || selectedUser) && (
            <button type="submit" className="btn btn-primary">
              {isCountryRole ? "Assign Country Co-Admin" : "Create Admin"}
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              resetForm();
            }}
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}
