const OPTIONAL_EMPTY_ALLOWED_FIELDS = new Set([
  "phone_home",
  "nominee_mobile_number",
  "nominee2_mobile_number",
  "nominee_aadhar_number",
  "blood_group",
  "office_name",
  "sub_post",
  "block",
  "disease",
  "cause_of_illness",
  "bank_account_number",
  "bank_ifsc_code",
  "bank_holder_name",
  "landmark",
]);

const FIELD_VALIDATORS: Record<string, (value: string) => boolean> = {
  gender: (value) => ["Male", "Female", "Other"].includes(value),
  father_husband_name: (value) => value.trim().length >= 2,
  department_id: (value) => value.trim().length > 0,
  post_id: (value) => value.trim().length > 0,
  nominee_name: (value) => value.trim().length === 0 || value.trim().length >= 2,
  nominee_relationship: (value) => value.trim().length === 0 || value.trim().length >= 2,
  nominee_mobile_number: (value) => value === "" || /^\d{10}$/.test(value),
  nominee_aadhar_number: (value) => value === "" || /^\d{12}$/.test(value),
  nominee2_relationship: (value) => value.trim().length === 0 || value.trim().length >= 2,
  nominee2_mobile_number: (value) => value === "" || /^\d{10}$/.test(value),
  phone_home: (value) => value === "" || /^\d{10}$/.test(value),
  blood_group: (value) => value === "" || /^(A|B|AB|O)[+-]$/.test(value.toUpperCase()),
  office_name: (value) => value === "" || (value.trim().length >= 2 && value.trim().length <= 255),
  sub_post: (value) => value === "" || value.trim().length <= 255,
  block: (value) => value === "" || value.trim().length <= 255,
  disease: (value) => value === "" || value.trim().length <= 255,
  cause_of_illness: (value) => value === "" || value.trim().length <= 1000,
  phone_number: (value) => /^\d{10}$/.test(value),
  bank_account_number: (value) => value === "" || /^\d{10,18}$/.test(value),
  bank_ifsc_code: (value) => value === "" || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.toUpperCase()),
  bank_holder_name: (value) => value === "" || (value.trim().length >= 2 && value.trim().length <= 255),
  house_flat_no: (value) => value.trim().length > 0,
  street_locality: (value) => value.trim().length > 0,
  village_city: (value) => value.trim().length > 0,
  district: (value) => value.trim().length > 0,
  state: (value) => value.trim().length > 0,
  pincode: (value) => /^\d{6}$/.test(value),
  country: (value) => value.trim().length > 0,
  landmark: () => true,
};

export function validateProfileUpdatePayload(updates: Record<string, unknown>) {
  const errors: Record<string, string> = {};

  for (const [field, value] of Object.entries(updates)) {
    const validator = FIELD_VALIDATORS[field];
    if (!validator) {
      continue;
    }

    const normalized = typeof value === "string" ? value.trim() : String(value).trim();

    if (normalized === "" && OPTIONAL_EMPTY_ALLOWED_FIELDS.has(field)) {
      continue;
    }

    if (!validator(normalized)) {
      errors[field] = `Invalid ${field.replace(/_/g, " ")}.`;
    }
  }

  return errors;
}
