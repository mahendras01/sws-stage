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

test("verifyPincodeMatch skips strict matching when the postal source has no records for a valid 6-digit code", async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async () =>
      new Response(JSON.stringify([{ Message: "No records found", PostOffice: null, Status: "Error" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    const result = await verifyPincodeMatch({
      pincode: "232341",
      district: "Lucknow",
      villageCity: "Sadar",
      state: "Uttar Pradesh",
    });

    assert.equal(result, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("verifyPincodeMatch accepts equivalent locality names that share the same village root even when one side is a fuller office name", async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify([
          {
            Status: "Success",
            Message: "Success",
            PostOffice: [
              {
                Name: "Mahanagar Colony",
                District: "Lucknow",
                State: "Uttar Pradesh",
              },
            ],
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );

    const result = await verifyPincodeMatch({
      pincode: "226008",
      district: "Lucknow",
      villageCity: "Mahanagar",
      state: "Uttar Pradesh",
    });

    assert.equal(result, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("verifyPincodeMatch accepts a valid PIN when the district and state match even if the village name differs across local records", async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify([
          {
            Status: "Success",
            Message: "Success",
            PostOffice: [
              { Name: "Suryapura", District: "Ballia", State: "Uttar Pradesh" },
              { Name: "Basantpur (Ballia)", District: "Ballia", State: "Uttar Pradesh" },
            ],
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );

    const result = await verifyPincodeMatch({
      pincode: "277301",
      district: "Ballia",
      villageCity: "Beruarbari",
      state: "Uttar Pradesh",
    });

    assert.equal(result, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("verifyPincodeMatch rejects a same-PIN village that belongs to a different district even when the state and PIN match", async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify([
          {
            Status: "Success",
            Message: "Success",
            PostOffice: [
              { Name: "Tlioi", District: "Amethi", State: "Uttar Pradesh" },
              { Name: "Rahi", District: "Raebareli", State: "Uttar Pradesh" },
            ],
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );

    const validVillageMatch = await verifyPincodeMatch({
      pincode: "229010",
      district: "Amethi",
      villageCity: "Tlioi",
      state: "Uttar Pradesh",
    });

    const invalidVillageMismatch = await verifyPincodeMatch({
      pincode: "229010",
      district: "Amethi",
      villageCity: "Rahi",
      state: "Uttar Pradesh",
    });

    assert.equal(validVillageMatch, true);
    assert.equal(invalidVillageMismatch, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
