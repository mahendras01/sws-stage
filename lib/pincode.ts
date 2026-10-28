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

function areEquivalentTokens(left: string, right: string): boolean {
  if (left === right) {
    return true;
  }

  const maxDistance = left.length <= 6 ? 1 : 2;
  return levenshteinDistance(left, right) <= maxDistance;
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

  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return false;
  }

  const compareBySubsequence = (shorter: string[], longer: string[]) => {
    let longerIndex = 0;
    for (const token of shorter) {
      let matched = false;
      while (longerIndex < longer.length) {
        const candidate = longer[longerIndex];
        if (areEquivalentTokens(token, candidate)) {
          matched = true;
          longerIndex += 1;
          break;
        }
        longerIndex += 1;
      }

      if (!matched) {
        return false;
      }
    }

    return true;
  };

  if (leftTokens.length !== rightTokens.length) {
    if (leftTokens.length < rightTokens.length) {
      return compareBySubsequence(leftTokens, rightTokens);
    }

    return compareBySubsequence(rightTokens, leftTokens);
  }

  return leftTokens.every((token, index) => areEquivalentTokens(token, rightTokens[index]));
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
    return [];
  }

  const result = payload[0];

  if (result?.Status !== "Success") {
    return [];
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
    return [];
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

  if (options.length === 0) {
    return true;
  }

  const normalizedDistrict = input.district.trim();
  const normalizedVillageCity = input.villageCity.trim();
  const normalizedState = input.state.trim();

  const sameStateOptions = options.filter(
    (option) => normalizeLocationTextForComparison(option.state) === normalizeLocationTextForComparison(normalizedState),
  );

  if (sameStateOptions.length === 0) {
    return false;
  }

  const districtMatches = sameStateOptions.some(
    (option) => normalizeLocationTextForComparison(option.district) === normalizeLocationTextForComparison(normalizedDistrict),
  );

  if (!normalizedVillageCity) {
    return districtMatches;
  }

  const sameDistrictVillageMatch = sameStateOptions.some(
    (option) =>
      normalizeLocationTextForComparison(option.district) === normalizeLocationTextForComparison(normalizedDistrict) &&
      areEquivalentLocationNames(option.name, normalizedVillageCity),
  );

  if (sameDistrictVillageMatch) {
    return true;
  }

  if (districtMatches) {
    const conflictingVillageMatch = sameStateOptions.some(
      (option) =>
        normalizeLocationTextForComparison(option.district) !== normalizeLocationTextForComparison(normalizedDistrict) &&
        areEquivalentLocationNames(option.name, normalizedVillageCity),
    );

    if (conflictingVillageMatch) {
      return false;
    }

    return true;
  }

  return false;
}
