export type PincodeLocationOption = {
  name: string;
  district: string;
  state: string;
};

export function normalizePincode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function normalizeLocationTextForComparison(value: string): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function levenshteinDistance(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let row = 0; row < rows; row += 1) {
    matrix[row][0] = row;
  }

  for (let col = 0; col < cols; col += 1) {
    matrix[0][col] = col;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost,
      );
    }
  }

  return matrix[left.length][right.length];
}

export function areEquivalentLocationNames(left: string, right: string): boolean {
  const normalizedLeft = normalizeLocationTextForComparison(left);
  const normalizedRight = normalizeLocationTextForComparison(right);

  if (!normalizedLeft && !normalizedRight) {
    return true;
  }

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  if (normalizedLeft === normalizedRight) {
    return true;
  }

  const leftTokens = normalizedLeft.split(" ").filter(Boolean);
  const rightTokens = normalizedRight.split(" ").filter(Boolean);

  if (leftTokens.length !== rightTokens.length) {
    return false;
  }

  return leftTokens.every((token, index) => {
    const otherToken = rightTokens[index];
    if (token === otherToken) {
      return true;
    }

    const maxDistance = token.length <= 6 ? 1 : 2;
    return levenshteinDistance(token, otherToken) <= maxDistance;
  });
}

export function deriveAddressFromPincodeOptions(
  options: PincodeLocationOption[],
  fallback: { village_city: string; district: string; state: string } = { village_city: "", district: "", state: "" },
): { village_city: string; district: string; state: string } {
  if (options.length === 0) {
    return fallback;
  }

  const firstOption = options[0];

  return {
    village_city: firstOption.name.trim() || fallback.village_city,
    district: firstOption.district.trim() || fallback.district,
    state: firstOption.state.trim() || fallback.state,
  };
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
      normalizeLocationTextForComparison(option.district) === normalizeLocationTextForComparison(normalizedDistrict) &&
      normalizeLocationTextForComparison(option.state) === normalizeLocationTextForComparison(normalizedState) &&
      areEquivalentLocationNames(option.name, normalizedVillageCity)
    );
  });
}
