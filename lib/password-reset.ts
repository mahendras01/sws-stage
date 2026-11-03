export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;

export type PasswordResetValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validatePasswordResetInput(newPassword: string, confirmPassword: string): PasswordResetValidationResult {
  const password = String(newPassword ?? "");
  const confirmation = String(confirmPassword ?? "");

  if (!password || !confirmation) {
    return { ok: false, message: "Please enter and confirm the new password." };
  }

  if (password !== confirmation) {
    return { ok: false, message: "New password and confirm password do not match." };
  }

  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }

  return { ok: true };
}
