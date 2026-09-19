export const UP_DISTRICT_NAMES = [
  "Agra",
  "Aligarh",
  "Ambedkar Nagar",
  "Amethi",
  "Amroha",
  "Auraiya",
  "Ayodhya",
  "Azamgarh",
  "Baghpat",
  "Bahraich",
  "Ballia",
  "Balrampur",
  "Banda",
  "Barabanki",
  "Bareilly",
  "Basti",
  "Bhadohi",
  "Bijnor",
  "Budaun",
  "Bulandshahr",
  "Chandauli",
  "Chitrakoot",
  "Deoria",
  "Etah",
  "Etawah",
  "Farrukhabad",
  "Fatehpur",
  "Firozabad",
  "Gautam Buddha Nagar",
  "Ghaziabad",
  "Ghazipur",
  "Gonda",
  "Gorakhpur",
  "Hamirpur",
  "Hapur",
  "Hardoi",
  "Hathras",
  "Jalaun",
  "Jaunpur",
  "Jhansi",
  "Kannauj",
  "Kanpur Dehat",
  "Kanpur Nagar",
  "Kasganj",
  "Kaushambi",
  "Kushinagar",
  "Lakhimpur Kheri",
  "Lalitpur",
  "Lucknow",
  "Maharajganj",
  "Mahoba",
  "Mainpuri",
  "Mathura",
  "Mau",
  "Meerut",
  "Mirzapur",
  "Moradabad",
  "Muzaffarnagar",
  "Pilibhit",
  "Pratapgarh",
  "Prayagraj",
  "Rae Bareli",
  "Rampur",
  "Saharanpur",
  "Sambhal",
  "Sant Kabir Nagar",
  "Shahjahanpur",
  "Shamli",
  "Shravasti",
  "Siddharthnagar",
  "Sitapur",
  "Sonbhadra",
  "Sultanpur",
  "Unnao",
  "Varanasi",
] as const;

export function normalizeDistrictName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function findDistrictByName(input: string): string | null {
  const normalizedInput = normalizeDistrictName(input ?? "");

  if (!normalizedInput) {
    return null;
  }

  return (
    UP_DISTRICT_NAMES.find((district) => normalizeDistrictName(district) === normalizedInput) ??
    UP_DISTRICT_NAMES.find(
      (district) =>
        normalizeDistrictName(district).includes(normalizedInput) ||
        normalizedInput.includes(normalizeDistrictName(district)),
    ) ??
    null
  );
}

export function normalizePincode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export async function resolveDistrictFromPincode(pincode: string): Promise<{ districtName: string; stateName: string }> {
  const normalized = normalizePincode(pincode);

  if (!/^\d{6}$/.test(normalized)) {
    throw new Error("PIN code must be exactly 6 digits.");
  }

  const response = await fetch(`https://api.postalpincode.in/pincode/${normalized}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Unable to verify PIN code. Please try again.");
  }

  const payload = await response.json();

  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error("No location details found for this PIN code.");
  }

  const result = payload[0];

  if (result?.Status !== "Success") {
    throw new Error(result?.Message || "No location details found for this PIN code.");
  }

  const offices = Array.isArray(result.PostOffice) ? result.PostOffice : [];
  const candidates = offices
    .map((office: Record<string, string | undefined>) => ({
      district: String(office.District ?? "").trim(),
      state: String(office.State ?? "").trim(),
    }))
    .filter((office: { district: string; state: string }) => office.district && office.state);

  if (candidates.length === 0) {
    throw new Error("No valid location details found for this PIN code.");
  }

  const stateName = candidates[0].state;
  const normalizedState = stateName.toLowerCase();

  if (!normalizedState.includes("uttar pradesh")) {
    throw new Error("The entered PIN code does not belong to Uttar Pradesh.");
  }

  const matchedDistrict = candidates
    .map((office: { district: string; state: string }) => office.district)
    .find((district: string) => !!findDistrictByName(district));

  if (!matchedDistrict) {
    throw new Error("This PIN code is valid, but it does not match any district in Uttar Pradesh.");
  }

  return {
    districtName: matchedDistrict,
    stateName,
  };
}
