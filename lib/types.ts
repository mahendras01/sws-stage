export type UserStatus = "pending" | "approved" | "rejected";
export type DeathStatus = "active" | "closed";
export type UserRole = "user" | "country_co_admin" | "district_admin" | "district_co_admin" | "super_admin";

export interface User {
  id: string;
  email: string;
  name: string;
  aadhar_number: string;
  pan_number: string;
  date_of_birth: string | null;
  ehrms_code: string | null;
  gender: string | null;
  father_husband_name: string | null;
  department_id: string | null;
  post_id: string | null;
  nominee_name: string | null;
  nominee_relationship: string | null;
  nominee_mobile_number: string | null;
  nominee2_relationship: string | null;
  nominee2_mobile_number: string | null;
  bank_account_number: string;
  bank_ifsc_code: string;
  bank_holder_name: string;
  phone_number: string;
  phone_home: string | null;
  blood_group: string | null;
  office_name: string | null;
  sub_post: string | null;
  block: string | null;
  disease: string | null;
  cause_of_illness: string | null;
  role: UserRole;
  district: string | null;
  house_flat_no: string | null;
  street_locality: string | null;
  landmark: string | null;
  village_city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
  status: UserStatus;
  is_admin: boolean;
  rejected_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Death {
  id: string;
  member_name: string;
  member_id: string | null;
  death_date: string;
  age: number | null;
  cause_of_death: string | null;
  family_info: string | null;
  amount_raised: number;
  status: DeathStatus;
  created_by: string | null;
  created_at: string;
}

export interface Contribution {
  id: string;
  death_id: string;
  contributor_id: string;
  contributor_name: string;
  amount: number;
  contribution_date: string;
  created_at: string;
}

export interface AdminDashboardStats {
  totalUsers: number;
  pendingUsers: number;
  approvedUsers: number;
  rejectedUsers: number;
  deaths: number;
  contributions: number;
  isDistrictAdmin: boolean;
  district: string | null;
}

export interface SignupInput {
  email: string;
  password: string;
  name: string;
  aadhar_number: string;
  pan_number: string;
  date_of_birth: string;
  ehrms_code: string;
  confirm_ehrms_code: string;
  gender: string;
  father_husband_name: string;
  department_id: string;
  post_id: string;
  nominee_name: string;
  nominee_relationship: string;
  nominee_mobile_number: string;
  bank_account_number: string;
  bank_ifsc_code: string;
  bank_holder_name: string;
  phone_number: string;
  house_flat_no: string;
  street_locality: string;
  landmark: string;
  village_city: string;
  district: string;
  state: string;
  pincode: string;
  country: string;
  accept_terms: boolean;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      is_admin: boolean;
      role: UserRole;
      district: string | null;
      status: UserStatus;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    is_admin: boolean;
    role: UserRole;
    district: string | null;
    status: UserStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    is_admin: boolean;
    role: UserRole;
    district: string | null;
    status: UserStatus;
  }
}
