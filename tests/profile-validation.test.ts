import assert from "node:assert/strict";
import test from "node:test";

import { validateProfileUpdatePayload } from "../lib/profile-validation.ts";

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
