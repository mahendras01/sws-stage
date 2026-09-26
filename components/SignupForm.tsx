"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { lookupPincodeDetails, normalizePincode } from "@/lib/pincode";

type DepartmentOption = { id: string; name: string };
type PostOption = { id: string; department_id: string; name: string };

type SignupFormState = {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
  aadhar_number: string;
  pan_number: string;
  date_of_birth: string;
  ehrms_code: string;
  confirm_ehrms_code: string;
  role_number: string;
  gender: string;
  father_husband_name: string;
  department_id: string;
  post_id: string;
  nominee_name: string;
  nominee_relationship: string;
  nominee_mobile_number: string;
  nominee_aadhar_number: string;
  reference_name: string;
  bank_account_number: string;
  bank_ifsc_code: string;
  bank_holder_name: string;
  phone_number: string;
  blood_group: string;
  house_flat_no: string;
  street_locality: string;
  landmark: string;
  village_city: string;
  district: string;
  state: string;
  pincode: string;
  country: string;
  permanent_same_as_current: boolean;
  permanent_house_flat_no: string;
  permanent_street_locality: string;
  permanent_landmark: string;
  permanent_village_city: string;
  permanent_district: string;
  permanent_state: string;
  permanent_pincode: string;
  permanent_country: string;
  accept_terms: boolean;
};

type FieldConfig = {
  name: Exclude<keyof SignupFormState, "accept_terms" | "permanent_same_as_current">;
  label: string;
  type: "text" | "email" | "password" | "tel" | "date" | "select";
  placeholder?: string;
  fullWidth?: boolean;
  readOnly?: boolean;
  inputMode?: "numeric";
};

const initialFormState: SignupFormState = {
  name: "",
  email: "",
  password: "",
  confirm_password: "",
  aadhar_number: "",
  pan_number: "",
  date_of_birth: "",
  ehrms_code: "",
  confirm_ehrms_code: "",
  role_number: "",
  gender: "",
  father_husband_name: "",
  department_id: "",
  post_id: "",
  nominee_name: "",
  nominee_relationship: "",
  nominee_mobile_number: "",
  nominee_aadhar_number: "",
  reference_name: "",
  bank_account_number: "",
  bank_ifsc_code: "",
  bank_holder_name: "",
  phone_number: "",
  blood_group: "",
  house_flat_no: "",
  street_locality: "",
  landmark: "",
  village_city: "",
  district: "",
  state: "",
  pincode: "",
  country: "India",
  permanent_same_as_current: false,
  permanent_house_flat_no: "",
  permanent_street_locality: "",
  permanent_landmark: "",
  permanent_village_city: "",
  permanent_district: "",
  permanent_state: "",
  permanent_pincode: "",
  permanent_country: "India",
  accept_terms: false,
};

const genderOptions = ["Male", "Female", "Other"];
const bloodGroupOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const stateOptions = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export default function SignupForm() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<SignupFormState>(initialFormState);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [posts, setPosts] = useState<PostOption[]>([]);
  const [masterDataReady, setMasterDataReady] = useState(false);
  const [pincodeOptions, setPincodeOptions] = useState<Array<{ name: string; district: string; state: string }>>([]);
  const [pincodeStatus, setPincodeStatus] = useState<string>("");

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const response = await fetch("/api/master-data", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load department data.");
        }

        setDepartments(data.departments ?? []);
        setPosts(data.posts ?? []);
      } catch {
        setErrors((prev) => ({ ...prev, department_id: "Unable to load departments and posts right now." }));
      } finally {
        setMasterDataReady(true);
      }
    };

    void loadMasterData();
  }, []);

  const departmentPosts = posts.filter((post) => post.department_id === form.department_id);

  const handlePincodeLookup = async (pincode: string) => {
    const normalized = normalizePincode(pincode);

    if (normalized.length !== 6) {
      setPincodeOptions([]);
      setPincodeStatus("");
      return;
    }

    try {
      setPincodeStatus("Checking PIN code...");
      const options = await lookupPincodeDetails(normalized);
      setPincodeOptions(options);

      const firstOption = options[0];
      setForm((prev) => ({
        ...prev,
        district: firstOption.district || prev.district,
        state: firstOption.state || prev.state,
        village_city: options.length === 1 ? firstOption.name : prev.village_city,
        ...(prev.permanent_same_as_current
          ? {
              permanent_district: firstOption.district || prev.permanent_district || prev.district,
              permanent_state: firstOption.state || prev.permanent_state || prev.state,
              permanent_village_city: options.length === 1 ? firstOption.name : prev.permanent_village_city || prev.village_city,
            }
          : {}),
      }));

      setErrors((prev) => ({ ...prev, pincode: "", district: "", state: "", village_city: "" }));
      setPincodeStatus(
        options.length > 1
          ? "Multiple locations found for this PIN code. Please choose the correct village/city."
          : "PIN code matched successfully.",
      );
    } catch (error) {
      setPincodeOptions([]);
      setPincodeStatus(error instanceof Error ? error.message : "Unable to fetch location details for this PIN code. Please try again.");
      setErrors((prev) => ({ ...prev, pincode: error instanceof Error ? error.message : "Unable to fetch location details for this PIN code." }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const { name, type, value } = target;
    const checked = "checked" in target ? target.checked : false;
    const fieldName = name as keyof SignupFormState;
    const nextValue = type === "checkbox" ? checked : fieldName === "pincode" || fieldName === "permanent_pincode" ? normalizePincode(value) : value;

    setForm((prev) => {
      if (fieldName === "department_id") {
        return { ...prev, department_id: value, post_id: "" };
      }

      if (fieldName === "permanent_same_as_current" && checked) {
        return {
          ...prev,
          permanent_same_as_current: true,
          permanent_house_flat_no: prev.house_flat_no,
          permanent_street_locality: prev.street_locality,
          permanent_landmark: prev.landmark,
          permanent_village_city: prev.village_city,
          permanent_district: prev.district,
          permanent_state: prev.state,
          permanent_pincode: prev.pincode,
          permanent_country: prev.country || "India",
        };
      }

      if (fieldName === "permanent_same_as_current" && !checked) {
        return { ...prev, permanent_same_as_current: false };
      }

      if (fieldName === "house_flat_no" && prev.permanent_same_as_current) {
        return { ...prev, house_flat_no: value, permanent_house_flat_no: value };
      }

      if (fieldName === "street_locality" && prev.permanent_same_as_current) {
        return { ...prev, street_locality: value, permanent_street_locality: value };
      }

      if (fieldName === "landmark" && prev.permanent_same_as_current) {
        return { ...prev, landmark: value, permanent_landmark: value };
      }

      if (fieldName === "village_city" && prev.permanent_same_as_current) {
        return { ...prev, village_city: value, permanent_village_city: value };
      }

      if (fieldName === "district" && prev.permanent_same_as_current) {
        return { ...prev, district: value, permanent_district: value };
      }

      if (fieldName === "state" && prev.permanent_same_as_current) {
        return { ...prev, state: value, permanent_state: value };
      }

      if (fieldName === "pincode" && prev.permanent_same_as_current) {
        return { ...prev, pincode: value, permanent_pincode: value };
      }

      if (fieldName === "country" && prev.permanent_same_as_current) {
        return { ...prev, country: value, permanent_country: value };
      }

      return { ...prev, [fieldName]: nextValue };
    });
    setErrors((prev) => ({ ...prev, [fieldName]: "" }));

    if ((fieldName === "pincode" || fieldName === "permanent_pincode") && typeof nextValue === "string") {
      const currentPincode = fieldName === "pincode" ? nextValue : form.permanent_pincode;
      if (currentPincode.length === 6) {
        void handlePincodeLookup(currentPincode);
      } else {
        setPincodeOptions([]);
        setPincodeStatus("");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    if (!form.accept_terms) {
      setErrors({ accept_terms: "You must accept the Terms and Privacy Policy to continue." });
      showToast("Please accept the terms and privacy policy to register.", "error");
      setLoading(false);
      return;
    }

    try {
      const normalizedForm: SignupFormState = {
        ...form,
        ...Object.fromEntries(
          Object.entries(form).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]),
        ),
      } as SignupFormState;

      if (normalizedForm.permanent_same_as_current) {
        normalizedForm.permanent_house_flat_no = normalizedForm.house_flat_no;
        normalizedForm.permanent_street_locality = normalizedForm.street_locality;
        normalizedForm.permanent_landmark = normalizedForm.landmark;
        normalizedForm.permanent_village_city = normalizedForm.village_city;
        normalizedForm.permanent_district = normalizedForm.district;
        normalizedForm.permanent_state = normalizedForm.state;
        normalizedForm.permanent_pincode = normalizedForm.pincode;
        normalizedForm.permanent_country = normalizedForm.country || "India";
      }

      const formData = new FormData();
      Object.entries(normalizedForm).forEach(([key, value]) => {
        if (key === "accept_terms" || key === "permanent_same_as_current") {
          if (key === "accept_terms") {
            formData.append(key, value ? "true" : "false");
          }
          return;
        }

        formData.append(key, String(value));
      });

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors);
        }
        showToast(data.message || "Signup failed", "error");
        return;
      }

      setSuccess(true);
      showToast(data.message, "success");
    } catch {
      showToast("An error occurred during signup", "error");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="card mx-auto w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Registration Submitted</h2>
        <p className="mt-2 text-neutral">
          Waiting for admin approval. You will be able to login once your account is approved.
        </p>
        <Link href="/login" className="btn-primary mt-6 inline-block">
          Go to Login
        </Link>
      </div>
    );
  }

  const personalFields: FieldConfig[] = [
    { name: "name", label: "Full Name", type: "text", placeholder: "Enter your full name" },
    { name: "father_husband_name", label: "Father's Name", type: "text", placeholder: "Enter father's name" },
    { name: "email", label: "Email", type: "email", placeholder: "you@example.com" },
    {
      name: "password",
      label: "Password",
      type: "password",
      placeholder: "Minimum 8 characters",
    },
    { name: "confirm_password", label: "Confirm Password", type: "password", placeholder: "Re-enter password" },
    { name: "aadhar_number", label: "Aadhar Number", type: "text", placeholder: "12 digits" },
    { name: "pan_number", label: "PAN Number", type: "text", placeholder: "ABCDE1234F" },
    { name: "date_of_birth", label: "Date Of Birth (As per Aadhar)", type: "date" },
    { name: "phone_number", label: "Phone Number", type: "tel", placeholder: "10 digits" },
    { name: "blood_group", label: "Blood Group", type: "select" },
  ] as const;

  const employmentFields: FieldConfig[] = [
    { name: "ehrms_code", label: "EHRMS कोड", type: "text", placeholder: "Enter EHRMS code" },
    { name: "confirm_ehrms_code", label: "EHRMS कोड की पुष्टि करें", type: "text", placeholder: "Re-enter EHRMS code" },
    { name: "role_number", label: "Role Number", type: "text", placeholder: "Enter role number if any" },
    { name: "gender", label: "जेंडर", type: "select" },
    { name: "department_id", label: "विभाग (Department)", type: "select" },
    { name: "post_id", label: "पद (Post)", type: "select" },
    { name: "nominee_name", label: "नॉमिनी का नाम", type: "text", placeholder: "Enter nominee name" },
    { name: "nominee_relationship", label: "नॉमिनी से संबंध", type: "text", placeholder: "Enter relationship" },
    { name: "nominee_mobile_number", label: "नॉमिनी का मोबाइल नंबर", type: "tel", placeholder: "10 digits" },
    { name: "nominee_aadhar_number", label: "Nominee Aadhaar Number (नॉमिनी का आधार नंबर)", type: "text", placeholder: "12 digits", inputMode: "numeric" },
    { name: "reference_name", label: "Reference Name (Who referred you for registration?)", type: "text", placeholder: "Enter referral name if any" },
    { name: "pincode", label: "PIN Code", type: "text", placeholder: "6 digits", inputMode: "numeric" },
    { name: "village_city", label: "Block / Village / City", type: "text", placeholder: "Enter block, village or city" },
    { name: "district", label: "District", type: "text", placeholder: "Enter district" },
  ] as const;

  const currentAddressFields: FieldConfig[] = [
    { name: "house_flat_no", label: "House/Flat No.", type: "text", placeholder: "Enter house or flat number", fullWidth: true },
    { name: "street_locality", label: "Street/Locality", type: "text", placeholder: "Enter street or locality", fullWidth: true },
    { name: "landmark", label: "Landmark (Optional)", type: "text", placeholder: "Enter landmark", fullWidth: true },
    { name: "pincode", label: "PIN Code", type: "text", placeholder: "6 digits", inputMode: "numeric" },
    { name: "village_city", label: "Village/City", type: "text", placeholder: "Enter village or city" },
    { name: "district", label: "District", type: "text", placeholder: "Enter district" },
    { name: "state", label: "State", type: "select", placeholder: "Select state" },
    { name: "country", label: "Country", type: "text", placeholder: "India", readOnly: true },
  ] as const;

  const permanentAddressFields: FieldConfig[] = [
    { name: "permanent_house_flat_no", label: "House/Flat No.", type: "text", placeholder: "Enter permanent house or flat number", fullWidth: true },
    { name: "permanent_street_locality", label: "Street/Locality", type: "text", placeholder: "Enter permanent street or locality", fullWidth: true },
    { name: "permanent_landmark", label: "Landmark (Optional)", type: "text", placeholder: "Enter permanent landmark", fullWidth: true },
    { name: "permanent_pincode", label: "PIN Code", type: "text", placeholder: "6 digits", inputMode: "numeric" },
    { name: "permanent_village_city", label: "Village/City", type: "text", placeholder: "Enter permanent village or city" },
    { name: "permanent_district", label: "District", type: "text", placeholder: "Enter permanent district" },
    { name: "permanent_state", label: "State", type: "select", placeholder: "Select permanent state" },
    { name: "permanent_country", label: "Country", type: "text", placeholder: "India", readOnly: true },
  ] as const;

  const renderField = (field: FieldConfig) => {
    const isError = Boolean(errors[field.name]);
    const isVillageSelect = field.name === "village_city" && pincodeOptions.length > 1;

    if (field.type === "select" || isVillageSelect) {
      let selectOptions: Array<{ value: string; label: string }> = [];

      if (field.name === "gender") {
        selectOptions = genderOptions.map((option) => ({ value: option, label: option }));
      } else if (field.name === "blood_group") {
        selectOptions = bloodGroupOptions.map((option) => ({ value: option, label: option }));
      } else if (field.name === "department_id") {
        selectOptions = departments.map((option) => ({ value: option.id, label: option.name }));
      } else if (field.name === "post_id") {
        selectOptions = departmentPosts.map((option) => ({ value: option.id, label: option.name }));
      } else if (isVillageSelect) {
        selectOptions = pincodeOptions.map((option) => ({ value: option.name, label: option.name }));
      } else {
        selectOptions = stateOptions.map((option) => ({ value: option, label: option }));
      }

      const selectedValue = field.name === "department_id" ? form.department_id : field.name === "post_id" ? form.post_id : form[field.name];

      return (
        <div key={field.name} className="space-y-1">
          <label htmlFor={field.name} className="label-text">
            {field.label}
          </label>
          <select
            id={field.name}
            name={field.name}
            value={String(selectedValue ?? "")}
            onChange={handleChange}
            disabled={field.name === "post_id" && (!form.department_id || departmentPosts.length === 0)}
            className={`input-field ${isError ? "border-danger" : ""} ${field.name === "post_id" && (!form.department_id || departmentPosts.length === 0) ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <option value="">
              {field.name === "gender" ? "Select gender" : field.name === "blood_group" ? "Select blood group" : field.name === "department_id" ? "Select Department" : field.name === "post_id" ? "Select Post" : isVillageSelect ? "Select village/city" : "Select state"}
            </option>
            {selectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {isError && <p className="mt-1 text-xs text-danger">{errors[field.name]}</p>}
        </div>
      );
    }

    return (
      <div key={field.name} className={field.fullWidth ? "sm:col-span-2" : ""}>
        <label htmlFor={field.name} className="label-text">
          {field.label}
        </label>
        <input
          id={field.name}
          name={field.name}
          type={field.type}
          value={form[field.name]}
          onChange={handleChange}
          className={`input-field ${isError ? "border-danger" : ""}`}
          placeholder={field.placeholder}
          readOnly={field.readOnly}
          inputMode={field.inputMode}
        />
        {(field.name === "password" || field.name === "confirm_password") && !isError && (
          <p className="mt-1 text-[11px] text-slate-500">Minimum 8 characters. Passwords must match.</p>
        )}
        {field.name === "pincode" && pincodeStatus && (
          <p className={`mt-1 text-xs ${errors.pincode ? "text-danger" : "text-slate-500"}`}>{pincodeStatus}</p>
        )}
        {isError && <p className="mt-1 text-xs text-danger">{errors[field.name]}</p>}
      </div>
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      method="post"
      action="/api/auth/signup"
      className="card mx-auto w-full max-w-3xl space-y-6"
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Join the Society</h1>
        <p className="mt-1 text-sm text-neutral">Register with your KYC details and address</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Personal Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {personalFields.map((field) => renderField(field))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Employment Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {employmentFields.map((field) => renderField(field))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Current Address</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {currentAddressFields.map((field) => renderField(field))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              name="permanent_same_as_current"
              checked={form.permanent_same_as_current}
              onChange={handleChange}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <span>Permanent address is same as current address</span>
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Permanent Address</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {permanentAddressFields.map((field) => renderField(field))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            name="accept_terms"
            checked={form.accept_terms}
            onChange={handleChange}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          <span>
            I agree to the <Link href="/terms" className="font-medium text-sky-700 underline">Terms and Conditions</Link>{" "}
            and <Link href="/privacy-policy" className="font-medium text-sky-700 underline">Privacy Policy</Link>, and I confirm that the information provided is accurate.
          </span>
        </label>
        {errors.accept_terms && <p className="mt-2 text-xs text-danger">{errors.accept_terms}</p>}
      </div>

      {!masterDataReady && (
        <p className="text-center text-sm text-slate-500">Loading departments and positions...</p>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Submitting..." : "Submit Registration"}
      </button>

      <p className="text-center text-sm text-neutral">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Login
        </Link>
      </p>
    </form>
  );
}
