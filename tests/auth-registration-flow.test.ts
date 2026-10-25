import assert from "node:assert/strict";
import test from "node:test";

import { canUserLogin, getDefaultNewUserStatus } from "../lib/auth-flow.ts";
import { verifyPincodeMatch } from "../lib/pincode.ts";
import { normalizePostingDetailsAddress, normalizeSignupAddressPayload } from "../lib/signup-address-mapping.ts";

test("new users are approved immediately while rejected users stay blocked", () => {
  assert.equal(getDefaultNewUserStatus(), "approved");
  assert.equal(canUserLogin("approved"), true);
  assert.equal(canUserLogin("pending"), true);
  assert.equal(canUserLogin("rejected"), false);
});

test("legacy posting details keep the district value even when the old field name is used", () => {
  const fallbackPayload = {
    district: "",
    street_locality: "Prayagraj",
    village_city: "",
    landmark: "Civil Lines",
  };

  const normalized = normalizePostingDetailsAddress(fallbackPayload);

  assert.equal(normalized.district, "Prayagraj");
  assert.equal(normalized.village_city, "Civil Lines");
});

test("existing district values are preserved and not overwritten by legacy data", () => {
  const normalized = normalizePostingDetailsAddress({
    district: "Lucknow",
    street_locality: "Prayagraj",
    village_city: "Aliganj",
    landmark: "Hazratganj",
  });

  assert.equal(normalized.district, "Lucknow");
  assert.equal(normalized.village_city, "Aliganj");
});

test("posting details use district and village city as the canonical values while keeping legacy aliases aligned", () => {
  const normalized = normalizePostingDetailsAddress({
    address: {
      houseFlatNo: "Kasmandi Kalan",
      villageCity: "Malihabad",
      district: "Lucknow",
      country: "India",
    },
    permanentAddress: {
      houseFlatNo: "F23, Kasmandi Kalan",
      villageCity: "Malihabad",
      district: "Lucknow",
      state: "Uttar Pradesh",
      pincode: "226002",
      country: "India",
    },
  });

  assert.equal(normalized.district, "Lucknow");
  assert.equal(normalized.village_city, "Malihabad");
  assert.equal(normalized.street_locality, "Lucknow");
  assert.equal(normalized.landmark, "Malihabad");
  assert.equal(normalized.state, "Uttar Pradesh");
  assert.equal(normalized.pincode, "226002");
});

test("nested address objects are flattened to the flat signup schema expected by the API", () => {
  const normalized = normalizeSignupAddressPayload({
    address: {
      houseFlatNo: "Kasmandi Kalan",
      villageCity: "Malihabad",
      district: "Lucknow",
      country: "India",
    },
    permanentAddress: {
      houseFlatNo: "F23, Kasmandi Kalan",
      villageCity: "Malihabad",
      district: "Lucknow",
      state: "Uttar Pradesh",
      pincode: "226002",
      country: "India",
    },
    name: "Test User",
  });

  assert.equal(normalized.house_flat_no, "Kasmandi Kalan");
  assert.equal(normalized.district, "Lucknow");
  assert.equal(normalized.village_city, "Malihabad");
  assert.equal(normalized.country, "India");
  assert.equal(normalized.permanent_house_flat_no, "F23, Kasmandi Kalan");
  assert.equal(normalized.permanent_state, "Uttar Pradesh");
  assert.equal(normalized.permanent_pincode, "226002");
});

test("verifyPincodeMatch accepts valid postal locality variants while still rejecting mismatched data", async () => {
  const validVariant = await verifyPincodeMatch({
    pincode: "226008",
    district: "Lucknow",
    villageCity: "Sarojani Nagar",
    state: "Uttar Pradesh",
  });

  const invalidVariant = await verifyPincodeMatch({
    pincode: "226008",
    district: "Noida",
    villageCity: "Sarojini Nagar",
    state: "Uttar Pradesh",
  });

  assert.equal(validVariant, true);
  assert.equal(invalidVariant, false);
});
