import type { SignupInput } from "./types";

const PASSWORD_POLICY = /^.{8,}$/;

function toDateFromInput(value: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getAgeFromDob(dateOfBirth: string): number | null {
  const dob = toDateFromInput(dateOfBirth);
  if (!dob) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age;
}

export function calculateMembershipExpiryDate(dateOfBirth: string): string | null {
  const dob = toDateFromInput(dateOfBirth);
  if (!dob) {
    return null;
  }

  const expiryDate = new Date(dob);
  expiryDate.setFullYear(expiryDate.getFullYear() + 60);
  return expiryDate.toISOString().slice(0, 10);
}

export function isMembershipExpired(dateOfBirth: string, asOfDate = new Date()): boolean {
  const expiryDate = calculateMembershipExpiryDate(dateOfBirth);
  if (!expiryDate) {
    return false;
  }

  const expiry = new Date(`${expiryDate}T00:00:00`);
  return asOfDate >= expiry;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateSignup(data: SignupInput): ValidationResult {
  const errors: Record<string, string> = {};

  const normalized = {
    name: data.name?.trim() ?? "",
    email: data.email?.trim() ?? "",
    password: data.password?.trim() ?? "",
    confirm_password: data.confirm_password?.trim() ?? "",
    aadhar_number: data.aadhar_number?.trim() ?? "",
    pan_number: data.pan_number?.trim() ?? "",
    date_of_birth: data.date_of_birth?.trim() ?? "",
    ehrms_code: data.ehrms_code?.trim() ?? "",
    confirm_ehrms_code: data.confirm_ehrms_code?.trim() ?? "",
    role_number: data.role_number?.trim() ?? "",
    gender: data.gender?.trim() ?? "",
    father_husband_name: data.father_husband_name?.trim() ?? "",
    department_id: data.department_id?.trim() ?? "",
    post_id: data.post_id?.trim() ?? "",
    nominee_name: data.nominee_name?.trim() ?? "",
    nominee_relationship: data.nominee_relationship?.trim() ?? "",
    nominee_mobile_number: data.nominee_mobile_number?.trim() ?? "",
    nominee_aadhar_number: data.nominee_aadhar_number?.trim() ?? "",
    reference_name: data.reference_name?.trim() ?? "",
    bank_account_number: data.bank_account_number?.trim() ?? "",
    bank_ifsc_code: data.bank_ifsc_code?.trim() ?? "",
    bank_holder_name: data.bank_holder_name?.trim() ?? "",
    phone_number: data.phone_number?.trim() ?? "",
    blood_group: data.blood_group?.trim() ?? "",
    house_flat_no: data.house_flat_no?.trim() ?? "",
    street_locality: data.street_locality?.trim() ?? "",
    landmark: data.landmark?.trim() ?? "",
    village_city: data.village_city?.trim() ?? "",
    district: data.district?.trim() ?? "",
    state: data.state?.trim() ?? "",
    pincode: data.pincode?.trim() ?? "",
    country: data.country?.trim() ?? "",
    permanent_same_as_current: Boolean(data.permanent_same_as_current),
    permanent_house_flat_no: data.permanent_house_flat_no?.trim() ?? "",
    permanent_street_locality: data.permanent_street_locality?.trim() ?? "",
    permanent_landmark: data.permanent_landmark?.trim() ?? "",
    permanent_village_city: data.permanent_village_city?.trim() ?? "",
    permanent_district: data.permanent_district?.trim() ?? "",
    permanent_state: data.permanent_state?.trim() ?? "",
    permanent_pincode: data.permanent_pincode?.trim() ?? "",
    permanent_country: data.permanent_country?.trim() ?? "",
    accept_terms: Boolean(data.accept_terms),
  };

  if (!normalized.name || normalized.name.length < 3) {
    errors.name = "Full name must be at least 3 characters";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!normalized.email || !emailRegex.test(normalized.email)) {
    errors.email = "Valid email is required";
  }

  if (!normalized.password || !PASSWORD_POLICY.test(normalized.password)) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (!normalized.confirm_password) {
    errors.confirm_password = "Please confirm your password.";
  } else if (normalized.password && normalized.confirm_password !== normalized.password) {
    errors.confirm_password = "Passwords do not match.";
  }

  if (!normalized.aadhar_number || !/^\d{12}$/.test(normalized.aadhar_number)) {
    errors.aadhar_number = "Aadhar must be exactly 12 digits";
  }

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!normalized.pan_number || !panRegex.test(normalized.pan_number.toUpperCase())) {
    errors.pan_number = "Invalid PAN format (e.g., ABCDE1234F)";
  }

  if (!normalized.date_of_birth) {
    errors.date_of_birth = "Date Of Birth (As per Aadhar) is required";
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(normalized.date_of_birth)) {
      errors.date_of_birth = "Enter a valid date in YYYY-MM-DD format";
    } else {
      const dob = new Date(`${normalized.date_of_birth}T00:00:00`);
      const today = new Date();
      const minimumDate = new Date();
      minimumDate.setFullYear(today.getFullYear() - 120);

      if (Number.isNaN(dob.getTime()) || dob > today) {
        errors.date_of_birth = "Date of birth cannot be in the future";
      } else if (dob < minimumDate) {
        errors.date_of_birth = "Date of birth must be a realistic value";
      } else {
        const age = getAgeFromDob(normalized.date_of_birth);
        if (age === null) {
          errors.date_of_birth = "Date of birth is invalid";
        } else if (age < 18 || age > 55) {
          errors.date_of_birth = "Registration is allowed only for members aged 18 to 55 years.";
        }
      }
    }
  }

  const ehrmsCode = normalized.ehrms_code.toUpperCase();
  const confirmEhrmsCode = normalized.confirm_ehrms_code.toUpperCase();

  if (!normalized.ehrms_code) {
    errors.ehrms_code = "EHRMS code is required";
  } else if (ehrmsCode !== confirmEhrmsCode) {
    errors.confirm_ehrms_code = "EHRMS code and confirm EHRMS code do not match";
  }

  if (normalized.role_number && normalized.role_number.length < 2) {
    errors.role_number = "Role number must be at least 2 characters if entered";
  }

  if (!normalized.gender || !["Male", "Female", "Other"].includes(normalized.gender)) {
    errors.gender = "Please select a valid gender";
  }

  if (!normalized.father_husband_name || normalized.father_husband_name.length < 2) {
    errors.father_husband_name = "Father/Husband name is required";
  }

  if (!normalized.department_id) {
    errors.department_id = "Department is required";
  }

  if (!normalized.post_id) {
    errors.post_id = "Post is required";
  }

  if (!normalized.nominee_name || normalized.nominee_name.length < 2) {
    errors.nominee_name = "Nominee name is required";
  }

  if (!normalized.nominee_relationship || normalized.nominee_relationship.length < 2) {
    errors.nominee_relationship = "Nominee relationship is required";
  }

  if (!normalized.nominee_mobile_number || !/^\d{10}$/.test(normalized.nominee_mobile_number)) {
    errors.nominee_mobile_number = "Nominee mobile number must be exactly 10 digits";
  }

  if (!normalized.nominee_aadhar_number || !/^\d{12}$/.test(normalized.nominee_aadhar_number)) {
    errors.nominee_aadhar_number = "Nominee Aadhaar number must be exactly 12 digits";
  }

  if (normalized.reference_name && normalized.reference_name.length < 2) {
    errors.reference_name = "Reference name must be at least 2 characters if entered";
  }

  if (!normalized.phone_number || !/^\d{10}$/.test(normalized.phone_number)) {
    errors.phone_number = "Phone number must be exactly 10 digits";
  }

  if (!normalized.blood_group || !/^(A|B|AB|O)[+-]$/.test(normalized.blood_group)) {
    errors.blood_group = "Please select a valid blood group";
  }

  if (!normalized.house_flat_no) {
    errors.house_flat_no = "House/Flat No. is required";
  }

  if (!normalized.street_locality) {
    errors.street_locality = "Street/Locality is required";
  }

  if (!normalized.village_city) {
    errors.village_city = "Village/City is required";
  }

  if (!normalized.district) {
    errors.district = "District is required";
  }

  if (!normalized.state) {
    errors.state = "State is required";
  }

  if (!normalized.pincode || !/^\d{6}$/.test(normalized.pincode)) {
    errors.pincode = "PIN code must be exactly 6 digits";
  }

  if (!normalized.country) {
    errors.country = "Country is required";
  }

  if (!normalized.permanent_same_as_current) {
    if (!normalized.permanent_house_flat_no) {
      errors.permanent_house_flat_no = "Permanent house/flat no. is required";
    }

    if (!normalized.permanent_street_locality) {
      errors.permanent_street_locality = "Permanent street/locality is required";
    }

    if (!normalized.permanent_village_city) {
      errors.permanent_village_city = "Permanent village/city is required";
    }

    if (!normalized.permanent_district) {
      errors.permanent_district = "Permanent district is required";
    }

    if (!normalized.permanent_state) {
      errors.permanent_state = "Permanent state is required";
    }

    if (!normalized.permanent_pincode || !/^\d{6}$/.test(normalized.permanent_pincode)) {
      errors.permanent_pincode = "Permanent PIN code must be exactly 6 digits";
    }

    if (!normalized.permanent_country) {
      errors.permanent_country = "Permanent country is required";
    }
  }

  if (!normalized.accept_terms) {
    errors.accept_terms = "You must accept the Terms and Privacy Policy to continue";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateDeath(data: {
  member_name?: string;
  death_date?: string;
  age?: number | string;
}) {
  const errors: Record<string, string> = {};

  if (!data.member_name || data.member_name.trim().length < 2) {
    errors.member_name = "Member name is required";
  }

  if (!data.death_date) {
    errors.death_date = "Death date is required";
  }

  if (data.age !== undefined && data.age !== "" && data.age !== null) {
    const ageNum = Number(data.age);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
      errors.age = "Age must be a valid number";
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateContribution(data: { deathId?: string; contributorId?: string; amount?: number }) {
  const errors: Record<string, string> = {};

  if (!data.deathId) {
    errors.deathId = "Death ID is required";
  }

  if (!data.contributorId) {
    errors.contributorId = "Contributor is required";
  }

  if (!data.amount || data.amount <= 0) {
    errors.amount = "Amount must be greater than 0";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
