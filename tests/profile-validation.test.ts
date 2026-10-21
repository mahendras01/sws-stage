import assert from "node:assert/strict";
import test from "node:test";

import { deriveAddressFromPincodeOptions } from "../lib/pincode.ts";
import { validateProfileUpdatePayload } from "../lib/profile-validation.ts";
import { sanitizeEnglishTextInput, sanitizeEnglishTextInputForTyping, validateSignup } from "../lib/validation.ts";

test("validateProfileUpdatePayload accepts a full valid profile update with optional fields empty", () => {
  const payload = {
    gender: "Male",
    father_husband_name: "Ram Kumar",
    department_id: "dept-1",
    post_id: "post-1",
    phone_home: "",
    blood_group: "",
    office_name: "",
    sub_post: "",
    block: "",
    disease: "",
    cause_of_illness: "",
    phone_number: "9876543210",
    bank_account_number: "",
    bank_ifsc_code: "",
    bank_holder_name: "",
    house_flat_no: "D-567",
    street_locality: "Goverdhan Road",
    landmark: "",
    village_city: "Goverdhan",
    district: "Mathura",
    state: "Uttar Pradesh",
    pincode: "281502",
    country: "India",
  };

  assert.deepEqual(validateProfileUpdatePayload(payload), {});
});

test("validateProfileUpdatePayload accepts valid blood group and bank details without rejecting empty optional values", () => {
  const validPayload = {
    gender: "Male",
    father_husband_name: "Ram Kumar",
    department_id: "dept-1",
    post_id: "post-1",
    phone_home: "",
    blood_group: "AB-",
    office_name: "SWS Bharat Office",
    sub_post: "",
    block: "",
    disease: "",
    cause_of_illness: "",
    phone_number: "9876543210",
    bank_account_number: "123456789012",
    bank_ifsc_code: "HDFC0001234",
    bank_holder_name: "Ram Kumar",
    house_flat_no: "D-567",
    street_locality: "Goverdhan Road",
    landmark: "",
    village_city: "Goverdhan",
    district: "Mathura",
    state: "Uttar Pradesh",
    pincode: "281502",
    country: "India",
  };

  assert.deepEqual(validateProfileUpdatePayload(validPayload), {});
});

test("validateProfileUpdatePayload rejects genuinely invalid values while keeping optional fields optional", () => {
  const invalidPayload = {
    gender: "Male",
    father_husband_name: "R",
    department_id: "dept-1",
    post_id: "post-1",
    phone_home: "123",
    blood_group: "XYZ",
    office_name: "X",
    phone_number: "123",
    bank_account_number: "12",
    bank_ifsc_code: "BAD",
    bank_holder_name: "X",
    house_flat_no: "D-567",
    street_locality: "Goverdhan Road",
    village_city: "Goverdhan",
    district: "Mathura",
    state: "Uttar Pradesh",
    pincode: "28150",
    country: "India",
  };

  const errors = validateProfileUpdatePayload(invalidPayload);

  assert.equal(errors.father_husband_name, "Invalid father husband name.");
  assert.equal(errors.phone_home, "Invalid phone home.");
  assert.equal(errors.blood_group, "Invalid blood group.");
  assert.equal(errors.phone_number, "Invalid phone number.");
  assert.equal(errors.bank_account_number, "Invalid bank account number.");
  assert.equal(errors.bank_ifsc_code, "Invalid bank ifsc code.");
  assert.equal(errors.bank_holder_name, "Invalid bank holder name.");
  assert.equal(errors.pincode, "Invalid pincode.");
});

test("validateSignup accepts hidden current address fields left blank for a registration flow without visible address inputs", () => {
  const payload = {
    name: "Rahul Sharma",
    email: "rahul@example.com",
    password: "password123",
    confirm_password: "password123",
    aadhar_number: "123456789012",
    pan_number: "ABCDE1234F",
    date_of_birth: "1998-06-15",
    ehrms_code: "EHR123",
    confirm_ehrms_code: "EHR123",
    role_number: "MR-01",
    gender: "Male",
    father_husband_name: "Suresh Sharma",
    department_id: "dept-1",
    post_id: "post-1",
    nominee_name: "Priya Sharma",
    nominee_relationship: "Wife",
    nominee_mobile_number: "9876543210",
    reference_name: "Friend",
    bank_account_number: "123456789012",
    bank_ifsc_code: "HDFC0001234",
    bank_holder_name: "Rahul Sharma",
    phone_number: "9876543210",
    blood_group: "O+",
    house_flat_no: "B-101",
    street_locality: "Main Market",
    landmark: "Near Temple",
    village_city: "",
    district: "",
    state: "",
    pincode: "",
    country: "India",
    permanent_same_as_current: true,
    permanent_house_flat_no: "B-101",
    permanent_street_locality: "Main Market",
    permanent_landmark: "Near Temple",
    permanent_village_city: "Goverdhan",
    permanent_district: "Mathura",
    permanent_state: "Uttar Pradesh",
    permanent_pincode: "281502",
    permanent_country: "India",
    accept_terms: true,
  };

  assert.deepEqual(validateSignup(payload).errors, {});
});

test("validateSignup ignores an empty or short role number in the registration flow", () => {
  const payload = {
    name: "Rahul Sharma",
    email: "rahul@example.com",
    password: "password123",
    confirm_password: "password123",
    aadhar_number: "123456789012",
    pan_number: "ABCDE1234F",
    date_of_birth: "1998-06-15",
    ehrms_code: "EHR123",
    confirm_ehrms_code: "EHR123",
    role_number: "R",
    gender: "Male",
    father_husband_name: "Suresh Sharma",
    department_id: "dept-1",
    post_id: "post-1",
    nominee_name: "Priya Sharma",
    nominee_relationship: "Wife",
    nominee_mobile_number: "9876543210",
    reference_name: "Friend",
    bank_account_number: "123456789012",
    bank_ifsc_code: "HDFC0001234",
    bank_holder_name: "Rahul Sharma",
    phone_number: "9876543210",
    blood_group: "O+",
    house_flat_no: "B-101",
    street_locality: "Main Market",
    landmark: "Near Temple",
    village_city: "Goverdhan",
    district: "Mathura",
    state: "Uttar Pradesh",
    pincode: "281502",
    country: "India",
    permanent_same_as_current: true,
    permanent_house_flat_no: "B-101",
    permanent_street_locality: "Main Market",
    permanent_landmark: "Near Temple",
    permanent_village_city: "Goverdhan",
    permanent_district: "Mathura",
    permanent_state: "Uttar Pradesh",
    permanent_pincode: "281502",
    permanent_country: "India",
    accept_terms: true,
  };

  assert.deepEqual(validateSignup(payload).errors, {});
});

test("sanitizeEnglishTextInput strips Devanagari text while preserving valid English content", () => {
  assert.equal(sanitizeEnglishTextInput("राम Sharma"), "Sharma");
  assert.equal(sanitizeEnglishTextInput("A-12, Near Temple"), "A-12, Near Temple");
  assert.equal(sanitizeEnglishTextInput("   Rahul   Sharma   "), "Rahul Sharma");
});

test("sanitizeEnglishTextInputForTyping keeps normal spaces while the user types a multi-word name", () => {
  assert.equal(sanitizeEnglishTextInputForTyping("Suraj Kumar"), "Suraj Kumar");
  assert.equal(sanitizeEnglishTextInputForTyping("Suraj   Kumar"), "Suraj Kumar");
  assert.equal(sanitizeEnglishTextInputForTyping("Suraj Kumar  "), "Suraj Kumar ");
});

test("validateSignup rejects Devanagari characters in English-only registration fields", () => {
  const payload = {
    name: "राम शर्मा",
    email: "rahul@example.com",
    password: "password123",
    confirm_password: "password123",
    aadhar_number: "123456789012",
    pan_number: "ABCDE1234F",
    date_of_birth: "1998-06-15",
    ehrms_code: "EHR123",
    confirm_ehrms_code: "EHR123",
    gender: "Male",
    father_husband_name: "सूरज शर्मा",
    department_id: "dept-1",
    post_id: "post-1",
    nominee_name: "प्रिय शर्मा",
    nominee_relationship: "पत्नी",
    nominee_mobile_number: "9876543210",
    reference_name: "मित्र",
    bank_account_number: "123456789012",
    bank_ifsc_code: "HDFC0001234",
    bank_holder_name: "राम शर्मा",
    phone_number: "9876543210",
    blood_group: "O+",
    house_flat_no: "B-101",
    street_locality: "मुख्य मार्ग",
    landmark: "पास मंदिर",
    village_city: "गाँव",
    district: "मथुरा",
    state: "उत्तर प्रदेश",
    pincode: "281502",
    country: "India",
    permanent_same_as_current: false,
    permanent_house_flat_no: "B-101",
    permanent_street_locality: "मुख्य मार्ग",
    permanent_landmark: "पास मंदिर",
    permanent_village_city: "गाँव",
    permanent_district: "मथुरा",
    permanent_state: "उत्तर प्रदेश",
    permanent_pincode: "281502",
    permanent_country: "India",
    accept_terms: true,
  };

  const errors = validateSignup(payload).errors;
  assert.equal(errors.name, "केवल अंग्रेज़ी अक्षर, संख्या और सामान्य चिन्हों की अनुमति है।");
  assert.equal(errors.father_husband_name, "केवल अंग्रेज़ी अक्षर, संख्या और सामान्य चिन्हों की अनुमति है।");
  assert.equal(errors.street_locality, "केवल अंग्रेज़ी अक्षर, संख्या और सामान्य चिन्हों की अनुमति है।");
  assert.equal(errors.village_city, "केवल अंग्रेज़ी अक्षर, संख्या और सामान्य चिन्हों की अनुमति है।");
  assert.equal(errors.permanent_village_city, "केवल अंग्रेज़ी अक्षर, संख्या और सामान्य चिन्हों की अनुमति है।");
});

test("deriveAddressFromPincodeOptions uses the pincode match result to populate permanent address fields", () => {
  const result = deriveAddressFromPincodeOptions([
    { name: "Goverdhan", district: "Mathura", state: "Uttar Pradesh" },
    { name: "Mathura City", district: "Mathura", state: "Uttar Pradesh" },
  ]);

  assert.deepEqual(result, {
    village_city: "Goverdhan",
    district: "Mathura",
    state: "Uttar Pradesh",
  });
});

test("validateSignup requires a separate permanent address even when the checkbox is removed", () => {
  const payload = {
    name: "Rahul Sharma",
    email: "rahul@example.com",
    password: "password123",
    confirm_password: "password123",
    aadhar_number: "123456789012",
    pan_number: "ABCDE1234F",
    date_of_birth: "1998-06-15",
    ehrms_code: "EHR123",
    confirm_ehrms_code: "EHR123",
    gender: "Male",
    father_husband_name: "Suresh Sharma",
    department_id: "dept-1",
    post_id: "post-1",
    nominee_name: "Priya Sharma",
    nominee_relationship: "Wife",
    nominee_mobile_number: "9876543210",
    reference_name: "Friend",
    bank_account_number: "123456789012",
    bank_ifsc_code: "HDFC0001234",
    bank_holder_name: "Rahul Sharma",
    phone_number: "9876543210",
    blood_group: "O+",
    house_flat_no: "B-101",
    street_locality: "Main Market",
    landmark: "Near Temple",
    village_city: "Goverdhan",
    district: "Mathura",
    state: "Uttar Pradesh",
    pincode: "281502",
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
    accept_terms: true,
  };

  const errors = validateSignup(payload).errors;
  assert.equal(errors.permanent_house_flat_no, "स्थायी मकान/फ्लैट नंबर आवश्यक है");
  assert.equal(errors.permanent_village_city, "स्थायी गाँव/शहर आवश्यक है");
  assert.equal(errors.permanent_district, "स्थायी जिला आवश्यक है");
  assert.equal(errors.permanent_state, "स्थायी राज्य आवश्यक है");
  assert.equal(errors.permanent_pincode, "स्थायी पिन कोड बिल्कुल 6 अंकों का होना चाहिए");

  const staleTruePayload = { ...payload, permanent_same_as_current: true };
  const staleTrueErrors = validateSignup(staleTruePayload).errors;
  assert.equal(staleTrueErrors.permanent_house_flat_no, "स्थायी मकान/फ्लैट नंबर आवश्यक है");
  assert.equal(staleTrueErrors.permanent_village_city, "स्थायी गाँव/शहर आवश्यक है");
});

test("validateSignup requires the posting block field in the current posting details", () => {
  const payload = {
    name: "Rahul Sharma",
    email: "rahul@example.com",
    password: "password123",
    confirm_password: "password123",
    aadhar_number: "123456789012",
    pan_number: "ABCDE1234F",
    date_of_birth: "1998-06-15",
    ehrms_code: "EHR123",
    confirm_ehrms_code: "EHR123",
    gender: "Male",
    father_husband_name: "Suresh Sharma",
    department_id: "dept-1",
    post_id: "post-1",
    nominee_name: "Priya Sharma",
    nominee_relationship: "Wife",
    nominee_mobile_number: "9876543210",
    reference_name: "Friend",
    bank_account_number: "123456789012",
    bank_ifsc_code: "HDFC0001234",
    bank_holder_name: "Rahul Sharma",
    phone_number: "9876543210",
    blood_group: "O+",
    house_flat_no: "B-101",
    street_locality: "Main Market",
    landmark: "",
    village_city: "Goverdhan",
    district: "Mathura",
    state: "Uttar Pradesh",
    pincode: "281502",
    country: "India",
    permanent_same_as_current: true,
    permanent_house_flat_no: "B-101",
    permanent_street_locality: "Main Market",
    permanent_landmark: "Temple",
    permanent_village_city: "Goverdhan",
    permanent_district: "Mathura",
    permanent_state: "Uttar Pradesh",
    permanent_pincode: "281502",
    permanent_country: "India",
    accept_terms: true,
  };

  const errors = validateSignup(payload).errors;
  assert.equal(errors.landmark, "तैनाती ब्लॉक आवश्यक है");
});
