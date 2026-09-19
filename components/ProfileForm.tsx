"use client";

import { useEffect, useState } from "react";

type DepartmentOption = { id: string; name: string };
type PostOption = { id: string; department_id: string; name: string };

const readOnlyFields = [
  { key: "name", label: "Full Name" },
  { key: "email", label: "Email" },
  { key: "aadhar_number", label: "Aadhar Number" },
  { key: "pan_number", label: "PAN Number" },
  { key: "date_of_birth", label: "Date Of Birth (As per Aadhar)", type: "date" },
  { key: "ehrms_code", label: "EHRMS कोड" },
] as const;

const editableFields = [
  { key: "gender", label: "जेंडर", type: "select" },
  { key: "father_husband_name", label: "पिता/पति का नाम", type: "text" },
  { key: "department_id", label: "विभाग (Department)", type: "select" },
  { key: "post_id", label: "पद (Post)", type: "select" },
  { key: "nominee_name", label: "नॉमिनी का नाम", type: "text" },
  { key: "nominee_relationship", label: "नॉमिनी से संबंध", type: "text" },
  { key: "nominee_mobile_number", label: "नॉमिनी का मोबाइल नंबर", type: "tel" },
  { key: "phone_number", label: "Phone Number", type: "tel" },
  { key: "bank_account_number", label: "Bank Account Number", type: "text" },
  { key: "bank_ifsc_code", label: "Bank IFSC Code", type: "text" },
  { key: "bank_holder_name", label: "Bank Account Holder Name", type: "text" },
  { key: "house_flat_no", label: "House/Flat No.", type: "text" },
  { key: "street_locality", label: "Street/Locality", type: "text" },
  { key: "landmark", label: "Landmark", type: "text" },
  { key: "village_city", label: "Village/City", type: "text" },
  { key: "district", label: "District", type: "text" },
  { key: "state", label: "State", type: "text" },
  { key: "pincode", label: "PIN Code", type: "text" },
  { key: "country", label: "Country", type: "text" },
] as const;

type ProfileFormState = {
  name: string;
  email: string;
  aadhar_number: string;
  pan_number: string;
  date_of_birth: string;
  ehrms_code: string;
  gender: string;
  father_husband_name: string;
  department_id: string;
  post_id: string;
  nominee_name: string;
  nominee_relationship: string;
  nominee_mobile_number: string;
  phone_number: string;
  bank_account_number: string;
  bank_ifsc_code: string;
  bank_holder_name: string;
  house_flat_no: string;
  street_locality: string;
  landmark: string;
  village_city: string;
  district: string;
  state: string;
  pincode: string;
  country: string;
  nominee2_relationship: string;
  nominee2_mobile_number: string;
  phone_home: string;
  blood_group: string;
  office_name: string;
  sub_post: string;
  block: string;
  disease: string;
  cause_of_illness: string;
};

const initialState: ProfileFormState = {
  name: "",
  email: "",
  aadhar_number: "",
  pan_number: "",
  date_of_birth: "",
  ehrms_code: "",
  gender: "",
  father_husband_name: "",
  department_id: "",
  post_id: "",
  nominee_name: "",
  nominee_relationship: "",
  nominee_mobile_number: "",
  phone_number: "",
  bank_account_number: "",
  bank_ifsc_code: "",
  bank_holder_name: "",
  house_flat_no: "",
  street_locality: "",
  landmark: "",
  village_city: "",
  district: "",
  state: "",
  pincode: "",
  country: "India",
  nominee2_relationship: "",
  nominee2_mobile_number: "",
  phone_home: "",
  blood_group: "",
  office_name: "",
  sub_post: "",
  block: "",
  disease: "",
  cause_of_illness: "",
};

export default function ProfileForm() {
  const [openBasic, setOpenBasic] = useState(true);
  const [openOffice, setOpenOffice] = useState(false);
  const [openNominee, setOpenNominee] = useState(false);
  const [openOthers, setOpenOthers] = useState(false);
  const [form, setForm] = useState<ProfileFormState>(initialState);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [posts, setPosts] = useState<PostOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [profileResponse, masterResponse] = await Promise.all([
          fetch("/api/user/profile", { cache: "no-store" }),
          fetch("/api/master-data", { cache: "no-store" }),
        ]);

        const profileData = await profileResponse.json();
        const masterData = await masterResponse.json();

        if (!profileResponse.ok) {
          setError(profileData.message || "Unable to load profile right now.");
          return;
        }

        setDepartments(masterData.departments ?? []);
        setPosts(masterData.posts ?? []);

        setForm({
          name: profileData.user.name ?? "",
          email: profileData.user.email ?? "",
          aadhar_number: profileData.user.aadhar_number ?? "",
          pan_number: profileData.user.pan_number ?? "",
          date_of_birth: profileData.user.date_of_birth ?? "",
          ehrms_code: profileData.user.ehrms_code ?? "",
          gender: profileData.user.gender ?? "",
          father_husband_name: profileData.user.father_husband_name ?? "",
          department_id: profileData.user.department_id ?? "",
          post_id: profileData.user.post_id ?? "",
          nominee_name: profileData.user.nominee_name ?? "",
          nominee_relationship: profileData.user.nominee_relationship ?? "",
          nominee_mobile_number: profileData.user.nominee_mobile_number ?? "",
          nominee2_relationship: profileData.user.nominee2_relationship ?? "",
          nominee2_mobile_number: profileData.user.nominee2_mobile_number ?? "",
          phone_home: profileData.user.phone_home ?? "",
          blood_group: profileData.user.blood_group ?? "",
          office_name: profileData.user.office_name ?? "",
          sub_post: profileData.user.sub_post ?? "",
          block: profileData.user.block ?? "",
          disease: profileData.user.disease ?? "",
          cause_of_illness: profileData.user.cause_of_illness ?? "",
          phone_number: profileData.user.phone_number ?? "",
          bank_account_number: profileData.user.bank_account_number ?? "",
          bank_ifsc_code: profileData.user.bank_ifsc_code ?? "",
          bank_holder_name: profileData.user.bank_holder_name ?? "",
          house_flat_no: profileData.user.house_flat_no ?? "",
          street_locality: profileData.user.street_locality ?? "",
          landmark: profileData.user.landmark ?? "",
          village_city: profileData.user.village_city ?? "",
          district: profileData.user.district ?? "",
          state: profileData.user.state ?? "",
          pincode: profileData.user.pincode ?? "",
          country: profileData.user.country ?? "India",
        });
      } catch {
        setError("Unable to load profile right now.");
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

  const departmentPosts = posts.filter((post) => post.department_id === form.department_id);

  const handleChange = (key: keyof ProfileFormState, value: string) => {
    setForm((prev) => {
      if (key === "department_id") {
        return { ...prev, department_id: value, post_id: "" };
      }

      return { ...prev, [key]: value };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const payload = {
        gender: form.gender,
        father_husband_name: form.father_husband_name,
        department_id: form.department_id,
        post_id: form.post_id,
        nominee_name: form.nominee_name,
        nominee_relationship: form.nominee_relationship,
        nominee_mobile_number: form.nominee_mobile_number,
        nominee2_relationship: form.nominee2_relationship,
        nominee2_mobile_number: form.nominee2_mobile_number,
        phone_home: form.phone_home,
        blood_group: form.blood_group,
        office_name: form.office_name,
        sub_post: form.sub_post,
        block: form.block,
        disease: form.disease,
        cause_of_illness: form.cause_of_illness,
        phone_number: form.phone_number,
        bank_account_number: form.bank_account_number,
        bank_ifsc_code: form.bank_ifsc_code,
        bank_holder_name: form.bank_holder_name,
        house_flat_no: form.house_flat_no,
        street_locality: form.street_locality,
        landmark: form.landmark,
        village_city: form.village_city,
        district: form.district,
        state: form.state,
        pincode: form.pincode,
        country: form.country,
      };

      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to update profile.");
        if (data.errors) {
          const firstError = Object.values(data.errors as Record<string, string>)[0];
          if (firstError) {
            setError(firstError);
          }
        }
        return;
      }

      setSuccess(data.message || "Profile updated successfully.");
      setForm((prev) => ({ ...prev, ...data.user }));
    } catch {
      setError("Unable to update profile right now.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
        <p className="mt-2 text-sm text-slate-600">View and update your personal details.</p>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details accordion */}
        <div className="rounded-lg border border-slate-200">
          <button type="button" onClick={() => setOpenBasic((s) => !s)} className="w-full rounded-t-lg bg-slate-50 px-4 py-3 text-left text-sm font-semibold">
            Basic Details
          </button>
          {openBasic && (
            <div className="p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">EHRMS Code</label>
                  <input readOnly value={form.ehrms_code} className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-700" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                  <input readOnly value={form.email || "Not Provided"} className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-700" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Mobile</label>
                  <input value={form.phone_number} onChange={(e) => handleChange("phone_number", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Mobile (Home)</label>
                  <input value={form.phone_home} onChange={(e) => handleChange("phone_home", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Blood Group</label>
                  <input value={form.blood_group} onChange={(e) => handleChange("blood_group", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Office Details accordion */}
        <div className="rounded-lg border border-slate-200">
          <button type="button" onClick={() => setOpenOffice((s) => !s)} className="w-full rounded-t-lg bg-slate-50 px-4 py-3 text-left text-sm font-semibold">
            Office Details
          </button>
          {openOffice && (
            <div className="p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Office Name</label>
                  <input value={form.office_name} onChange={(e) => handleChange("office_name", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
                  <select value={form.department_id} onChange={(e) => handleChange("department_id", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900">
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Post</label>
                  <select value={form.post_id} onChange={(e) => handleChange("post_id", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900">
                    <option value="">Select Post</option>
                    {departmentPosts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Sub Post</label>
                  <input value={form.sub_post} onChange={(e) => handleChange("sub_post", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Block</label>
                  <input value={form.block} onChange={(e) => handleChange("block", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">District</label>
                  <input value={form.district} onChange={(e) => handleChange("district", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Nominee Details accordion */}
        <div className="rounded-lg border border-slate-200">
          <button type="button" onClick={() => setOpenNominee((s) => !s)} className="w-full rounded-t-lg bg-slate-50 px-4 py-3 text-left text-sm font-semibold">
            Nominee Details
          </button>
          {openNominee && (
            <div className="p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">First Nominee Name</label>
                  <input value={form.nominee_name} onChange={(e) => handleChange("nominee_name", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">First Nominee Relation</label>
                  <input value={form.nominee_relationship} onChange={(e) => handleChange("nominee_relationship", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">First Nominee Mobile</label>
                  <input value={form.nominee_mobile_number} onChange={(e) => handleChange("nominee_mobile_number", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Second Nominee Relation</label>
                  <input value={form.nominee2_relationship} onChange={(e) => handleChange("nominee2_relationship", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Second Nominee Mobile</label>
                  <input value={form.nominee2_mobile_number} onChange={(e) => handleChange("nominee2_mobile_number", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Others Details accordion */}
        <div className="rounded-lg border border-slate-200">
          <button type="button" onClick={() => setOpenOthers((s) => !s)} className="w-full rounded-t-lg bg-slate-50 px-4 py-3 text-left text-sm font-semibold">
            Others Details
          </button>
          {openOthers && (
            <div className="p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Home Address</label>
                  <input value={`${form.house_flat_no} ${form.street_locality} ${form.landmark} ${form.village_city}`} readOnly className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-700" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Home District</label>
                  <input value={form.district} onChange={(e) => handleChange("district", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Disease</label>
                  <input value={form.disease} onChange={(e) => handleChange("disease", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Cause of Illness</label>
                  <input value={form.cause_of_illness} onChange={(e) => handleChange("cause_of_illness", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end">
          <button type="submit" disabled={saving} className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
