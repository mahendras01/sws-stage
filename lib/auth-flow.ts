export type UserLoginStatus = "approved" | "pending" | "rejected" | string | null | undefined;

export function getDefaultNewUserStatus(): "approved" {
  return "approved";
}

export function canUserLogin(status: UserLoginStatus): boolean {
  return status !== "rejected";
}
