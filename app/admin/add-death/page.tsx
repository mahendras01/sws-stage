"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/Toast";
import LoadingSpinner from "@/components/LoadingSpinner";

interface ApprovedUser {
  id: string;
  name: string;
  email: string;
  district?: string | null;
  date_of_birth?: string | null;
}

function calculateAgeFromDob(dateOfBirth: string | null | undefined): number {
  if (!dateOfBirth) return 0;

  const dob = new Date(`${dateOfBirth}T00:00:00`);
  const today = new Date();

  if (Number.isNaN(dob.getTime())) return 0;

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return Math.max(age, 0);
}

function calculateAgeFromDates(dateOfBirth: string | null | undefined, deathDate: string): number {
  if (!dateOfBirth || !deathDate) return 0;

  const dob = new Date(`${dateOfBirth}T00:00:00`);
  const death = new Date(`${deathDate}T00:00:00`);

  if (Number.isNaN(dob.getTime()) || Number.isNaN(death.getTime()) || death < dob) {
    return 0;
  }

  let age = death.getFullYear() - dob.getFullYear();
  const monthDiff = death.getMonth() - dob.getMonth();
  const dayDiff = death.getDate() - dob.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return Math.max(age, 0);
}

function isValidAgeForDates(dateOfBirth: string | null | undefined, deathDate: string, ageValue: string): boolean {
  if (!dateOfBirth || !deathDate || !ageValue) return true;

  const dob = new Date(`${dateOfBirth}T00:00:00`);
  const death = new Date(`${deathDate}T00:00:00`);
  const numericAge = Number(ageValue);

  if (Number.isNaN(dob.getTime()) || Number.isNaN(death.getTime()) || death < dob) {
    return false;
  }

  if (!Number.isFinite(numericAge) || numericAge < 0) {
    return false;
  }

  const computedAge = calculateAgeFromDates(dateOfBirth, deathDate);
  return numericAge >= Math.max(computedAge - 1, 0) && numericAge <= computedAge + 1;
}

export default function AddDeathPage() {
  const { showToast } = useToast();
  const { data: session } = useSession();
  const [allApprovedUsers, setAllApprovedUsers] = useState<ApprovedUser[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [memberOptions, setMemberOptions] = useState<ApprovedUser[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    member_id: "",
    member_name: "",
    death_date: "",
    age: "",
    cause_of_death: "",
    family_info: "",
  });

  useEffect(() => {
    if (session?.user?.role !== "super_admin") {
      setLoading(false);
      return;
    }

    fetch("/api/admin/approved-users")
      .then((res) => res.json())
      .then((data) => {
        if (data.users) {
          const approvedUsers = data.users as ApprovedUser[];
          setAllApprovedUsers(approvedUsers);
          const uniqueDistricts = Array.from(
            new Set(
              approvedUsers
                .map((user) => user.district)
                .filter((district): district is string => Boolean(district && district.trim())),
            ),
          ).sort((a, b) => a.localeCompare(b));
          setDistricts(uniqueDistricts);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const loadMembersForDistrict = async (district: string) => {
    if (!district) {
      setMemberOptions([]);
      setForm((prev) => ({ ...prev, member_id: "", member_name: "" }));
      return;
    }

    try {
      const res = await fetch(`/api/admin/approved-users?district=${encodeURIComponent(district)}`);
      const data = await res.json();
      const usersForDistrict = (data.users ?? []) as ApprovedUser[];
      setMemberOptions(usersForDistrict);
      setForm((prev) => ({ ...prev, member_id: "", member_name: "" }));
    } catch {
      setMemberOptions([]);
      setForm((prev) => ({ ...prev, member_id: "", member_name: "" }));
    }
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const district = e.target.value;
    setSelectedDistrict(district);
    if (!district) {
      setMemberOptions([]);
      setForm((prev) => ({
        ...prev,
        member_id: "",
        member_name: "",
        death_date: "",
        age: "",
      }));
      return;
    }
    void loadMembersForDistrict(district);
  };

  const handleMemberSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = e.target.value;
    const user = memberOptions.find((u) => u.id === userId);
    const dob = user?.date_of_birth ?? null;
    const today = new Date().toISOString().slice(0, 10);
    const computedAge = calculateAgeFromDates(dob, today);

    setForm((prev) => ({
      ...prev,
      member_id: userId,
      member_name: user?.name ?? "",
      death_date: user ? today : "",
      age: user ? String(computedAge) : "",
    }));
  };

  const handleDeathDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const deathDate = e.target.value;
    const selectedMember = memberOptions.find((user) => user.id === form.member_id);
    const calculatedAge = calculateAgeFromDates(selectedMember?.date_of_birth ?? null, deathDate);

    setForm((prev) => ({
      ...prev,
      death_date: deathDate,
      age: selectedMember ? String(calculatedAge) : prev.age,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const selectedMember = memberOptions.find((user) => user.id === form.member_id);
    const dob = selectedMember?.date_of_birth ?? null;

    if (form.member_id && dob && form.death_date && !isValidAgeForDates(dob, form.death_date, form.age)) {
      setErrors({ age: "Age must be logically valid for the selected member's date of birth and death date." });
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/add-death", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        showToast(data.message || "Failed to add death record", "error");
        return;
      }

      showToast("Death record added", "success");
      setForm({
        member_id: "",
        member_name: "",
        death_date: "",
        age: "",
        cause_of_death: "",
        family_info: "",
      });
      setSelectedDistrict("");
      setMemberOptions([]);
    } catch {
      showToast("An error occurred", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (session?.user?.role !== "super_admin") {
    return (
      <div className="card py-12 text-center">
        <p className="text-lg font-semibold text-gray-900">Access restricted</p>
        <p className="mt-2 text-neutral">Only Super Admin can add death records.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Add Death Record</h1>
      <p className="mt-1 text-neutral">Create a new death record for society members</p>

      <form onSubmit={handleSubmit} className="card mt-8 max-w-2xl space-y-4">
        <div>
          <label htmlFor="district" className="label-text">
            District
          </label>
          <select
            id="district"
            value={selectedDistrict}
            onChange={handleDistrictChange}
            className="input-field"
          >
            <option value="">-- Select district --</option>
            {districts.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="member_id" className="label-text">
            Select Member (optional)
          </label>
          <select
            id="member_id"
            value={form.member_id}
            onChange={handleMemberSelect}
            className="input-field"
            disabled={!selectedDistrict || memberOptions.length === 0}
          >
            <option value="">{selectedDistrict ? "-- Select approved member --" : "-- Select district first --"}</option>
            {memberOptions.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="member_name" className="label-text">
            Member Name *
          </label>
          <input
            id="member_name"
            type="text"
            value={form.member_name}
            readOnly
            className={`input-field ${errors.member_name ? "border-danger" : ""}`}
            placeholder="Deceased member name"
          />
          {errors.member_name && (
            <p className="mt-1 text-xs text-danger">{errors.member_name}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="death_date" className="label-text">
              Death Date *
            </label>
            <input
              id="death_date"
              type="date"
              value={form.death_date}
              onChange={(e) => setForm((prev) => ({ ...prev, death_date: e.target.value }))}
              className={`input-field ${errors.death_date ? "border-danger" : ""}`}
            />
            {errors.death_date && (
              <p className="mt-1 text-xs text-danger">{errors.death_date}</p>
            )}
          </div>

          <div>
            <label htmlFor="age" className="label-text">
              Age
            </label>
            <input
              id="age"
              type="number"
              value={form.age}
              onChange={(e) => setForm((prev) => ({ ...prev, age: e.target.value }))}
              className={`input-field ${errors.age ? "border-danger" : ""}`}
              placeholder="Age at death"
              min="0"
              max="150"
            />
            {errors.age && <p className="mt-1 text-xs text-danger">{errors.age}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="cause_of_death" className="label-text">
            Cause of Death
          </label>
          <input
            id="cause_of_death"
            type="text"
            value={form.cause_of_death}
            onChange={(e) => setForm((prev) => ({ ...prev, cause_of_death: e.target.value }))}
            className="input-field"
            placeholder="Optional"
          />
        </div>

        <div>
          <label htmlFor="family_info" className="label-text">
            Family Information
          </label>
          <textarea
            id="family_info"
            value={form.family_info}
            onChange={(e) => setForm((prev) => ({ ...prev, family_info: e.target.value }))}
            className="input-field min-h-[100px] resize-y"
            placeholder="Optional family details"
          />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Adding..." : "Add Death Record"}
        </button>
      </form>
    </div>
  );
}
