export type PostingDetailsAddressInput = {
  district?: string | null;
  street_locality?: string | null;
  village_city?: string | null;
  landmark?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }

    const stringValue = String(value).trim();
    if (stringValue) {
      return stringValue;
    }
  }

  return "";
}

export function normalizeSignupAddressPayload<T extends Record<string, unknown>>(input: T): T {
  const next = { ...input } as Record<string, unknown>;
  const currentAddress = asRecord(next.address) ?? asRecord(next.currentAddress) ?? {};
  const permanentAddress = asRecord(next.permanentAddress) ?? asRecord(next.permanent_address) ?? {};

  const setField = (fieldName: string, ...values: unknown[]) => {
    const value = firstNonEmptyString(...values);
    if (value) {
      next[fieldName] = value;
    }
  };

  setField("house_flat_no", next.house_flat_no, currentAddress.houseFlatNo, currentAddress.house_flat_no, currentAddress.houseFlat, currentAddress.houseFlatNo);
  setField("street_locality", next.street_locality, currentAddress.streetLocality, currentAddress.street_locality, currentAddress.locality);
  setField("landmark", next.landmark, currentAddress.landmark, currentAddress.block);
  setField("village_city", next.village_city, currentAddress.villageCity, currentAddress.village_city, currentAddress.block, next.landmark, currentAddress.landmark);
  setField("district", next.district, currentAddress.district, currentAddress.districtName, next.street_locality, currentAddress.streetLocality, currentAddress.street_locality);
  setField("state", next.state, currentAddress.state, currentAddress.stateName, permanentAddress.state, permanentAddress.stateName);
  setField("pincode", next.pincode, currentAddress.pincode, currentAddress.postalCode, permanentAddress.pincode, permanentAddress.postalCode);
  setField("country", next.country, currentAddress.country, permanentAddress.country);

  setField("permanent_house_flat_no", next.permanent_house_flat_no, permanentAddress.houseFlatNo, permanentAddress.house_flat_no, permanentAddress.houseFlat);
  setField("permanent_street_locality", next.permanent_street_locality, permanentAddress.streetLocality, permanentAddress.street_locality, permanentAddress.locality);
  setField("permanent_landmark", next.permanent_landmark, permanentAddress.landmark, permanentAddress.block);
  setField("permanent_village_city", next.permanent_village_city, permanentAddress.villageCity, permanentAddress.village_city, permanentAddress.block);
  setField("permanent_district", next.permanent_district, permanentAddress.district, permanentAddress.districtName, next.permanent_street_locality);
  setField("permanent_state", next.permanent_state, permanentAddress.state, permanentAddress.stateName);
  setField("permanent_pincode", next.permanent_pincode, permanentAddress.pincode, permanentAddress.postalCode);
  setField("permanent_country", next.permanent_country, permanentAddress.country);

  const district = firstNonEmptyString(next.district, next.street_locality).trim();
  const villageCity = firstNonEmptyString(next.village_city, next.landmark).trim();

  if (district) {
    next.district = district;
  }

  if (villageCity) {
    next.village_city = villageCity;
  }

  return next as T;
}

export function normalizePostingDetailsAddress<T extends PostingDetailsAddressInput>(input: T): T {
  const normalized = normalizeSignupAddressPayload(input as Record<string, unknown>) as Record<string, unknown>;
  const district = firstNonEmptyString(normalized.district, normalized.street_locality).trim();
  const villageCity = firstNonEmptyString(normalized.village_city, normalized.landmark).trim();
  const state = firstNonEmptyString(normalized.state, normalized.permanent_state).trim();
  const pincode = firstNonEmptyString(normalized.pincode, normalized.permanent_pincode).trim();

  return {
    ...normalized,
    district,
    village_city: villageCity,
    street_locality: district || firstNonEmptyString(normalized.street_locality).trim(),
    landmark: villageCity || firstNonEmptyString(normalized.landmark).trim(),
    state: state || normalized.state,
    pincode: pincode || normalized.pincode,
  } as unknown as T;
}
