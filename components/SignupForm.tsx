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
  const [showPassword, setShowPassword] = useState(false);
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
          throw new Error(data.message || "विभाग डेटा लोड नहीं हो सका।");
        }

        setDepartments(data.departments ?? []);
        setPosts(data.posts ?? []);
      } catch {
        setErrors((prev) => ({ ...prev, department_id: "विभाग और पद अभी लोड नहीं हो सके हैं।" }));
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
      setPincodeStatus("पिन कोड की जाँच की जा रही है...");
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
          ? "इस पिन कोड के लिए कई स्थान मिले हैं। कृपया सही गाँव/शहर चुनें।"
          : "पिन कोड सही मिल गया है।",
      );
    } catch (error) {
      setPincodeOptions([]);
      setPincodeStatus(error instanceof Error ? error.message : "इस पिन कोड के लिए स्थान की जानकारी नहीं मिल सकी। कृपया पुनः प्रयास करें।");
      setErrors((prev) => ({ ...prev, pincode: error instanceof Error ? error.message : "इस पिन कोड के लिए स्थान की जानकारी नहीं मिल सकी।" }));
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
      setErrors({ accept_terms: "आगे बढ़ने के लिए नियम और गोपनीयता नीति स्वीकार करें।" });
      showToast("पंजीकरण के लिए नियम और गोपनीयता नीति स्वीकार करें।", "error");
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
        showToast(data.message || "पंजीकरण विफल रहा", "error");
        return;
      }

      setSuccess(true);
      showToast(data.message, "success");
    } catch {
      showToast("पंजीकरण के दौरान त्रुटि हुई", "error");
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
        <h2 className="text-xl font-bold text-gray-900">पंजीकरण सफल</h2>
        <p className="mt-2 text-neutral">
          पंजीकरण सफल हुआ। अब आप लॉगिन कर सकते हैं।
        </p>
        <Link href="/login" className="btn-primary mt-6 inline-block">
          लॉगिन पर जाएँ
        </Link>
      </div>
    );
  }

  const personalFields: FieldConfig[] = [
    { name: "name", label: "पूरा नाम", type: "text", placeholder: "अपना पूरा नाम दर्ज करें" },
    { name: "father_husband_name", label: "पिता का नाम", type: "text", placeholder: "पिता का नाम दर्ज करें" },
    { name: "email", label: "ईमेल", type: "email", placeholder: "you@example.com" },
    {
      name: "password",
      label: "पासवर्ड",
      type: "password",
      placeholder: "कम से कम 8 अक्षर",
    },
    { name: "date_of_birth", label: "जन्म तिथि (आधार के अनुसार)", type: "date" },
    { name: "phone_number", label: "फोन नंबर", type: "tel", placeholder: "10 अंकों का नंबर" },
    { name: "blood_group", label: "रक्त समूह", type: "select" },
  ] as const;

  const employmentFields: FieldConfig[] = [
    { name: "ehrms_code", label: "EHRMS कोड", type: "text", placeholder: "EHRMS कोड दर्ज करें" },
    { name: "confirm_ehrms_code", label: "EHRMS कोड की पुष्टि करें", type: "text", placeholder: "EHRMS कोड पुनः दर्ज करें" },
    { name: "role_number", label: "रोल नंबर", type: "text", placeholder: "यदि हो तो रोल नंबर दर्ज करें" },
    { name: "gender", label: "लिंग", type: "select" },
    { name: "department_id", label: "विभाग", type: "select" },
    { name: "post_id", label: "पद", type: "select" },
    { name: "nominee_name", label: "नॉमिनी का नाम", type: "text", placeholder: "नॉमिनी का नाम दर्ज करें" },
    { name: "nominee_relationship", label: "नॉमिनी से संबंध", type: "text", placeholder: "संबंध दर्ज करें" },
    { name: "nominee_mobile_number", label: "नॉमिनी का मोबाइल नंबर", type: "tel", placeholder: "10 अंकों का नंबर" },
  ] as const;

  const referenceField: FieldConfig = {
    name: "reference_name",
    label: "संदर्भ नाम (कौन आपको पंजीकरण के लिए लेकर आया?)",
    type: "text",
    placeholder: "यदि कोई हो तो संदर्भ नाम दर्ज करें",
  };

  const currentAddressFields: FieldConfig[] = [
    { name: "house_flat_no", label: "मकान/फ्लैट नंबर", type: "text", placeholder: "मकान या फ्लैट नंबर दर्ज करें", fullWidth: true },
    { name: "street_locality", label: "सड़क/इलाका", type: "text", placeholder: "सड़क या इलाका दर्ज करें", fullWidth: true },
    { name: "landmark", label: "स्मारक (वैकल्पिक)", type: "text", placeholder: "स्मारक दर्ज करें", fullWidth: true },
    { name: "pincode", label: "पिन कोड", type: "text", placeholder: "6 अंकों का कोड", inputMode: "numeric" },
    { name: "village_city", label: "गाँव/शहर", type: "text", placeholder: "गाँव या शहर दर्ज करें" },
    { name: "district", label: "जिला", type: "text", placeholder: "जिला दर्ज करें" },
    { name: "state", label: "राज्य", type: "select", placeholder: "राज्य चुनें" },
    { name: "country", label: "देश", type: "text", placeholder: "भारत", readOnly: true },
  ] as const;

  const permanentAddressFields: FieldConfig[] = [
    { name: "permanent_house_flat_no", label: "मकान/फ्लैट नंबर", type: "text", placeholder: "स्थायी मकान या फ्लैट नंबर दर्ज करें", fullWidth: true },
    { name: "permanent_street_locality", label: "सड़क/इलाका", type: "text", placeholder: "स्थायी सड़क या इलाका दर्ज करें", fullWidth: true },
    { name: "permanent_landmark", label: "स्मारक (वैकल्पिक)", type: "text", placeholder: "स्थायी स्मारक दर्ज करें", fullWidth: true },
    { name: "permanent_pincode", label: "पिन कोड", type: "text", placeholder: "6 अंकों का कोड", inputMode: "numeric" },
    { name: "permanent_village_city", label: "गाँव/शहर", type: "text", placeholder: "स्थायी गाँव या शहर दर्ज करें" },
    { name: "permanent_district", label: "जिला", type: "text", placeholder: "स्थायी जिला दर्ज करें" },
    { name: "permanent_state", label: "राज्य", type: "select", placeholder: "स्थायी राज्य चुनें" },
    { name: "permanent_country", label: "देश", type: "text", placeholder: "भारत", readOnly: true },
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

    const isPasswordField = field.name === "password" && field.type === "password";

    return (
      <div key={field.name} className={field.fullWidth ? "sm:col-span-2" : ""}>
        <label htmlFor={field.name} className="label-text">
          {field.label}
        </label>
        {isPasswordField ? (
          <div className="relative">
            <input
              id={field.name}
              name={field.name}
              type={showPassword ? "text" : "password"}
              value={form[field.name]}
              onChange={handleChange}
              className={`input-field pr-11 ${isError ? "border-danger" : ""}`}
              placeholder={field.placeholder}
              readOnly={field.readOnly}
              inputMode={field.inputMode}
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
        ) : (
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
        )}
        {field.name === "password" && !isError && (
          <p className="mt-1 text-[11px] text-slate-500">कम से कम 8 अक्षर.</p>
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
        <h1 className="text-2xl font-bold text-gray-900">सोसायटी से जुड़ें</h1>
        <p className="mt-1 text-sm text-neutral">अपनी KYC जानकारी और पता के साथ पंजीकरण करें</p>
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
            <span>स्थायी पता वर्तमान पते के समान है</span>
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Permanent Address</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {permanentAddressFields.map((field) => renderField(field))}
        </div>
      </div>

      {renderField(referenceField)}

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
            मैं <Link href="/terms" className="font-medium text-sky-700 underline">नियम और शर्तें</Link>{" "}
            तथा <Link href="/privacy-policy" className="font-medium text-sky-700 underline">गोपनीयता नीति</Link> से सहमत हूँ, और मैं पुष्टि करता हूँ कि प्रदान की गई जानकारी सही है।
          </span>
        </label>
        {errors.accept_terms && <p className="mt-2 text-xs text-danger">{errors.accept_terms}</p>}
      </div>

      {!masterDataReady && (
        <p className="text-center text-sm text-slate-500">विभाग और पद लोड हो रहे हैं...</p>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "सबमिट हो रहा है..." : "पंजीकरण सबमिट करें"}
      </button>

      <p className="text-center text-sm text-neutral">
        पहले से खाता है?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          लॉगिन
        </Link>
      </p>
    </form>
  );
}
