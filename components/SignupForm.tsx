"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { deriveAddressFromPincodeOptions, lookupPincodeDetails, normalizePincode } from "@/lib/pincode";
import { sanitizeEnglishTextInput, sanitizeEnglishTextInputForTyping } from "@/lib/validation";

type DepartmentOption = { id: string; name: string };
type PostOption = { id: string; department_id: string; name: string };

type SignupFormState = {
  name: string;
  aadhar_number: string;
  email: string;
  password: string;
  confirm_password: string;
  pan_number: string;
  date_of_birth: string;
  ehrms_code: string;
  confirm_ehrms_code: string;
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
  aadhar_number: "",
  email: "",
  password: "",
  confirm_password: "",
  pan_number: "",
  date_of_birth: "",
  ehrms_code: "",
  confirm_ehrms_code: "",
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

const requiredFieldNames = new Set([
  "name",
  "email",
  "password",
  "confirm_password",
  "aadhar_number",
  "date_of_birth",
  "ehrms_code",
  "confirm_ehrms_code",
  "gender",
  "father_husband_name",
  "department_id",
  "post_id",
  "nominee_name",
  "nominee_relationship",
  "nominee_mobile_number",
  "phone_number",
  "house_flat_no",
  "street_locality",
  "landmark",
  "permanent_house_flat_no",
  "permanent_street_locality",
  "permanent_village_city",
  "permanent_district",
  "permanent_state",
  "permanent_pincode",
  "permanent_country",
  "accept_terms",
]);

const genderOptions = ["Male", "Female", "Other"];

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
  const [permanentPincodeOptions, setPermanentPincodeOptions] = useState<Array<{ name: string; district: string; state: string }>>([]);
  const [permanentPincodeStatus, setPermanentPincodeStatus] = useState<string>("");

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
  const permanentVillageCityOptions = permanentPincodeOptions.filter(
    (option) => !form.permanent_district || option.district.toLowerCase() === form.permanent_district.trim().toLowerCase(),
  );

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

  const handlePermanentPincodeLookup = async (pincode: string) => {
    const normalized = normalizePincode(pincode);

    if (normalized.length !== 6) {
      setPermanentPincodeOptions([]);
      setPermanentPincodeStatus("");
      return;
    }

    try {
      setPermanentPincodeStatus("स्थायी पिन कोड की जाँच की जा रही है...");
      const options = await lookupPincodeDetails(normalized);
      setPermanentPincodeOptions(options);

      const matchingOptions = options.filter(
        (option) => !form.permanent_district || option.district.toLowerCase() === form.permanent_district.trim().toLowerCase(),
      );
      const nextOptions = matchingOptions.length > 0 ? matchingOptions : options;
      const autoFilledAddress = deriveAddressFromPincodeOptions(nextOptions, {
        village_city: form.permanent_village_city,
        district: form.permanent_district,
        state: form.permanent_state,
      });

      setForm((prev) => ({
        ...prev,
        permanent_district: autoFilledAddress.district || prev.permanent_district,
        permanent_state: autoFilledAddress.state || prev.permanent_state,
        permanent_village_city: nextOptions.length === 1 ? autoFilledAddress.village_city : prev.permanent_village_city || "",
      }));

      setErrors((prev) => ({
        ...prev,
        permanent_pincode: "",
        permanent_village_city: "",
        permanent_district: "",
        permanent_state: "",
      }));

      setPermanentPincodeStatus(
        nextOptions.length > 1
          ? "इस पिन कोड के लिए कई स्थान मिले हैं। कृपया सही गाँव/शहर चुनें।"
          : "स्थायी पिन कोड सही मिल गया है।",
      );
    } catch (error) {
      setPermanentPincodeOptions([]);
      setPermanentPincodeStatus(
        error instanceof Error ? error.message : "स्थायी पिन कोड के लिए स्थान की जानकारी नहीं मिल सकी। कृपया पुनः प्रयास करें।",
      );
      setErrors((prev) => ({
        ...prev,
        permanent_pincode: error instanceof Error ? error.message : "स्थायी पिन कोड के लिए स्थान की जानकारी नहीं मिल सकी।",
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const { name, type, value } = target;
    const checked = "checked" in target ? target.checked : false;
    const fieldName = name as keyof SignupFormState;

    let nextValue: string | boolean = type === "checkbox" ? checked : value;

    if (type !== "checkbox") {
      if (fieldName === "pincode" || fieldName === "permanent_pincode") {
        nextValue = normalizePincode(value);
      } else if (fieldName === "email") {
        nextValue = value.replace(/[^\u0000-\u007F]/g, "");
      } else if (
        [
          "name",
          "father_husband_name",
          "ehrms_code",
          "confirm_ehrms_code",
          "nominee_name",
          "nominee_relationship",
          "reference_name",
          "bank_holder_name",
          "house_flat_no",
          "street_locality",
          "landmark",
          "village_city",
          "district",
          "state",
          "country",
          "permanent_house_flat_no",
          "permanent_street_locality",
          "permanent_landmark",
          "permanent_village_city",
          "permanent_district",
          "permanent_state",
          "permanent_country",
        ].includes(fieldName)
      ) {
        nextValue = sanitizeEnglishTextInputForTyping(value);
      }
    }

    setForm((prev) => {
      if (fieldName === "department_id") {
        return { ...prev, department_id: value, post_id: "" };
      }

      if (fieldName === "permanent_district") {
        const districtMatches = permanentPincodeOptions.filter(
          (option) => option.district.toLowerCase() === value.trim().toLowerCase(),
        );
        const normalizedVillage = districtMatches.length === 1 ? districtMatches[0].name : prev.permanent_village_city;

        return {
          ...prev,
          permanent_district: value,
          permanent_village_city: districtMatches.length === 0 ? prev.permanent_village_city : normalizedVillage,
        };
      }

      return { ...prev, [fieldName]: nextValue };
    });
    setErrors((prev) => ({ ...prev, [fieldName]: "" }));

    if ((fieldName === "pincode" || fieldName === "permanent_pincode") && typeof nextValue === "string") {
      if (fieldName === "pincode") {
        if (nextValue.length === 6) {
          void handlePincodeLookup(nextValue);
        } else {
          setPincodeOptions([]);
          setPincodeStatus("");
        }
        return;
      }

      if (nextValue.length === 6) {
        void handlePermanentPincodeLookup(nextValue);
      } else {
        setPermanentPincodeOptions([]);
        setPermanentPincodeStatus("");
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const fieldName = e.currentTarget.name as keyof SignupFormState;
    const rawText = e.clipboardData.getData("text");

    if (
      fieldName === "email" ||
      [
        "name",
        "father_husband_name",
        "ehrms_code",
        "confirm_ehrms_code",
        "nominee_name",
        "nominee_relationship",
        "reference_name",
        "bank_holder_name",
        "house_flat_no",
        "street_locality",
        "landmark",
        "village_city",
        "district",
        "state",
        "country",
        "permanent_house_flat_no",
        "permanent_street_locality",
        "permanent_landmark",
        "permanent_village_city",
        "permanent_district",
        "permanent_state",
        "permanent_country",
      ].includes(fieldName)
    ) {
      e.preventDefault();
      const sanitizedText = fieldName === "email" ? rawText.replace(/[^\u0000-\u007F]/g, "") : sanitizeEnglishTextInputForTyping(rawText);
      const selectionStart = e.currentTarget.selectionStart ?? e.currentTarget.value.length;
      const selectionEnd = e.currentTarget.selectionEnd ?? e.currentTarget.value.length;
      const nextValue = `${e.currentTarget.value.slice(0, selectionStart)}${sanitizedText}${e.currentTarget.value.slice(selectionEnd)}`;

      setForm((prev) => ({ ...prev, [fieldName]: nextValue }));
      setErrors((prev) => ({ ...prev, [fieldName]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const nextErrors: Record<string, string> = {};

    if (!form.aadhar_number || !/^\d{12}$/.test(form.aadhar_number)) {
      nextErrors.aadhar_number = "आधार नंबर बिल्कुल 12 अंकों का होना चाहिए";
    }

    if (!form.password) {
      nextErrors.password = "पासवर्ड आवश्यक है";
    }

    if (!form.confirm_password) {
      nextErrors.confirm_password = "पासवर्ड की पुष्टि आवश्यक है";
    } else if (form.password !== form.confirm_password) {
      nextErrors.confirm_password = "पासवर्ड मेल नहीं खाते।";
    }

    if (!form.accept_terms) {
      nextErrors.accept_terms = "आगे बढ़ने के लिए नियम और गोपनीयता नीति स्वीकार करें।";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      showToast(Object.values(nextErrors)[0], "error");
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

      const formData = new FormData();
      Object.entries(normalizedForm).forEach(([key, value]) => {
        if (key === "accept_terms") {
          formData.append(key, value ? "true" : "false");
          return;
        }

        if (key === "permanent_same_as_current") {
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
    { name: "father_husband_name", label: "पिता/पति का नाम", type: "text", placeholder: "पिता का नाम दर्ज करें" },
    { name: "aadhar_number", label: "आधार नंबर", type: "text", placeholder: "12 अंकों का आधार नंबर" },
    { name: "email", label: "ईमेल", type: "email", placeholder: "you@example.com" },
    {
      name: "password",
      label: "पासवर्ड",
      type: "password",
      placeholder: "कम से कम 8 अक्षर",
    },
    {
      name: "confirm_password",
      label: "पासवर्ड की पुष्टि करें",
      type: "password",
      placeholder: "पासवर्ड पुनः दर्ज करें",
    },
    { name: "date_of_birth", label: "जन्म तिथि (आधार के अनुसार)", type: "date" },
    { name: "phone_number", label: "मोबाइल नंबर", type: "tel", placeholder: "10 अंकों का नंबर" },
  ] as const;

  const employmentFields: FieldConfig[] = [
    { name: "ehrms_code", label: "मानव संपदा पोर्टल ID (EHRMS कोड)", type: "text", placeholder: "मानव संपदा पोर्टल ID दर्ज करें" },
    { name: "confirm_ehrms_code", label: "मानव संपदा पोर्टल ID की पुष्टि करें (EHRMS कोड की पुष्टि करें)", type: "text", placeholder: "मानव संपदा पोर्टल ID पुनः दर्ज करें" },
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
    { name: "house_flat_no", label: "तैनाती गाँव", type: "text", placeholder: "तैनाती गाँव दर्ज करें", fullWidth: true },
    { name: "street_locality", label: "तैनाती जिला", type: "text", placeholder: "तैनाती जिला दर्ज करें", fullWidth: true },
    { name: "landmark", label: "तैनाती ब्लॉक", type: "text", placeholder: "तैनाती ब्लॉक दर्ज करें", fullWidth: true },
  ] as const;

  const permanentAddressFields: FieldConfig[] = [
    { name: "permanent_house_flat_no", label: "पता (आधार कार्ड के अनुसार)", type: "text", placeholder: "स्थायी मकान या फ्लैट नंबर दर्ज करें", fullWidth: true },
    { name: "permanent_pincode", label: "पिन कोड", type: "text", placeholder: "6 अंकों का कोड", inputMode: "numeric" },
    { name: "permanent_district", label: "जिला", type: "text", placeholder: "स्थायी जिला दर्ज करें" },
    { name: "permanent_village_city", label: "ब्लॉक", type: "text", placeholder: "ब्लॉक" },
    { name: "permanent_state", label: "राज्य", type: "select", placeholder: "स्थायी राज्य चुनें" },
    { name: "permanent_country", label: "देश", type: "text", placeholder: "भारत", readOnly: true },
  ] as const;

  const renderField = (field: FieldConfig) => {
    const isError = Boolean(errors[field.name]);
    const isRequired = requiredFieldNames.has(field.name);
    const isVillageSelect = field.name === "village_city" && pincodeOptions.length > 1;

    if (field.type === "select" || isVillageSelect) {
      let selectOptions: Array<{ value: string; label: string }> = [];

      if (field.name === "gender") {
        selectOptions = genderOptions.map((option) => ({ value: option, label: option }));
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
            {isRequired && <span className="ml-1 text-danger">*</span>}
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
              {field.name === "gender" ? "Select gender" : field.name === "department_id" ? "Select Department" : field.name === "post_id" ? "Select Post" : isVillageSelect ? "Select village/city" : "Select state"}
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

    const isPasswordField = (field.name === "password" || field.name === "confirm_password") && field.type === "password";

    return (
      <div key={field.name} className={field.fullWidth ? "sm:col-span-2" : ""}>
        <label htmlFor={field.name} className="label-text">
          {field.label}
          {isRequired && <span className="ml-1 text-danger">*</span>}
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
            onPaste={handlePaste}
            className={`input-field ${isError ? "border-danger" : ""}`}
            placeholder={field.placeholder}
            readOnly={field.readOnly}
            inputMode={field.inputMode}
          />
        )}
        {(field.name === "password" || field.name === "confirm_password") && !isError && (
          <p className="mt-1 text-[11px] text-slate-500">{field.name === "password" ? "कम से कम 8 अक्षर." : "पासवर्ड फिर से दर्ज करें."}</p>
        )}
        {(field.name === "pincode" || field.name === "permanent_pincode") && ((field.name === "pincode" ? pincodeStatus : permanentPincodeStatus) && (
          <p className={`mt-1 text-xs ${errors[field.name] ? "text-danger" : "text-slate-500"}`}>
            {field.name === "pincode" ? pincodeStatus : permanentPincodeStatus}
          </p>
        ))}
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
        <h2 className="text-lg font-semibold text-gray-900">Posting Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {currentAddressFields.map((field) => renderField(field))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Home Address</h2>
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
            <span className="text-danger">*</span> मैं <Link href="/terms" className="font-medium text-sky-700 underline">नियम और शर्तें</Link> से सहमत हूँ और मैंने SWS से जुड़ने एवं सहयोग करने संबंधी सारी जानकारी प्राप्त कर ली है। मैंने वेबसाइट पर उपलब्ध नियम व शर्तों को पढ़कर अच्छी तरह समझ लिया है और मैं सभी नियम व शर्तों से पूर्ण रूप से सहमत हूँ। यदि SWS द्वारा बनाए गए नियम व शर्तों के अंतर्गत मैं सहयोग नहीं करता/करती हूँ, तो मेरे नामिनी के द्वारा सहयोग प्राप्त करने का दावा नहीं किया जाएगा।
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
