export type PincodeLocationOption = {
  name: string;
  district: string;
  state: string;
};

export function normalizePincode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export async function lookupPincodeDetails(pincode: string): Promise<PincodeLocationOption[]> {
  const normalized = normalizePincode(pincode);

  if (!/^\d{6}$/.test(normalized)) {
    throw new Error("PIN code must be exactly 6 digits.");
  }

  const response = await fetch(`https://api.postalpincode.in/pincode/${normalized}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Unable to fetch location details for this PIN code. Please try again.");
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
  const options: Array<{ name: string; district: string; state: string }> = offices
    .map((office: Record<string, string | undefined>) => ({
      name: String(office.Name ?? "").trim(),
      district: String(office.District ?? "").trim(),
      state: String(office.State ?? "").trim(),
    }))
    .filter((option: { name: string; district: string; state: string }) => option.name && option.district && option.state);

  if (options.length === 0) {
    throw new Error("No valid location details found for this PIN code.");
  }

  const uniqueOptions = Array.from(
    new Map(options.map((option) => [`${option.name}|${option.district}|${option.state}`, option])).values(),
  );

  return uniqueOptions;
}

export async function verifyPincodeMatch(input: {
  pincode: string;
  district: string;
  villageCity: string;
  state: string;
}): Promise<boolean> {
  const normalizedPincode = normalizePincode(input.pincode);
  if (!/^\d{6}$/.test(normalizedPincode)) {
    return false;
  }

  const options = await lookupPincodeDetails(normalizedPincode);
  const normalizedDistrict = input.district.trim();
  const normalizedVillageCity = input.villageCity.trim();
  const normalizedState = input.state.trim();

  return options.some((option) => {
    return (
      option.district.toLowerCase() === normalizedDistrict.toLowerCase() &&
      option.state.toLowerCase() === normalizedState.toLowerCase() &&
      option.name.toLowerCase() === normalizedVillageCity.toLowerCase()
    );
  });
}
