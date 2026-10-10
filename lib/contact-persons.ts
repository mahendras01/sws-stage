import { supabase } from "./supabase";

export const MAX_CONTACT_PERSONS = 7;

export type ContactPerson = {
  id: string;
  name: string;
  designation: string | null;
  mobile_number: string;
  email: string | null;
  address: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

/** What non-super-admin visitors are allowed to see. */
export type PublicContactPerson = Pick<ContactPerson, "id" | "name" | "mobile_number">;

export type ContactPersonInput = {
  name?: unknown;
  designation?: unknown;
  mobile_number?: unknown;
  email?: unknown;
  address?: unknown;
  is_active?: unknown;
};

export function canManageContacts(role?: string | null) {
  return role === "super_admin";
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/** Validates and normalizes input. Returns either an error message or clean column values. */
export function parseContactInput(
  input: ContactPersonInput,
  { partial = false }: { partial?: boolean } = {},
): { error: string } | { values: Record<string, string | boolean | null> } {
  const values: Record<string, string | boolean | null> = {};

  if (!partial || input.name !== undefined) {
    const name = text(input.name);
    if (!name) return { error: "Name is required." };
    if (name.length > 150) return { error: "Name must be 150 characters or fewer." };
    values.name = name;
  }

  if (!partial || input.mobile_number !== undefined) {
    const mobile = text(input.mobile_number).replace(/[\s-]/g, "");
    if (!mobile) return { error: "Mobile number is required." };
    if (!/^\+?[0-9]{10,15}$/.test(mobile)) {
      return { error: "Enter a valid mobile number (10 to 15 digits, optional + prefix)." };
    }
    values.mobile_number = mobile;
  }

  if (!partial || input.designation !== undefined) {
    const designation = text(input.designation);
    if (designation.length > 150) return { error: "Designation must be 150 characters or fewer." };
    values.designation = designation || null;
  }

  if (!partial || input.email !== undefined) {
    const email = text(input.email);
    if (email && (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return { error: "Enter a valid email address." };
    }
    values.email = email || null;
  }

  if (!partial || input.address !== undefined) {
    const address = text(input.address);
    if (address.length > 500) return { error: "Address must be 500 characters or fewer." };
    values.address = address || null;
  }

  if (input.is_active !== undefined) {
    values.is_active = Boolean(input.is_active);
  }

  return { values };
}

export function toPublicContact(person: ContactPerson): PublicContactPerson {
  return { id: person.id, name: person.name, mobile_number: person.mobile_number };
}

export async function listContactPersons(includeInactive: boolean) {
  let query = supabase
    .from("contact_persons")
    .select("id, name, designation, mobile_number, email, address, sort_order, is_active, created_at, updated_at");

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return { data: (data as ContactPerson[] | null) ?? [], error };
}

export async function countContactPersons() {
  const { data, error } = await supabase.from("contact_persons").select("id");
  return { count: Array.isArray(data) ? data.length : 0, error };
}
