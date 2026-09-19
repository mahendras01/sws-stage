"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

type MemberRow = {
  id: string;
  name: string;
  email: string;
  phone_number?: string | null;
  house_flat_no?: string | null;
  street_locality?: string | null;
  village_city?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
};

export default function RegisteredMembersPage() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchMembers = async (district?: string) => {
    setLoading(true);
    try {
      const query = district ? `?district=${encodeURIComponent(district)}` : "";
      const res = await fetch(`/api/admin/approved-users${query}`);
      const data = await res.json();
      setMembers(data.users ?? []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadDistricts = async () => {
      try {
        const res = await fetch("/api/admin/approved-users");
        const data = await res.json();
        const uniqueDistricts: string[] = Array.from(
          new Set<string>(
            (data.users ?? [])
              .map((user: MemberRow) => user.district)
              .filter((value: string | null | undefined): value is string => Boolean(value && value.trim())),
          ),
        ).sort((a: string, b: string) => a.localeCompare(b));
        setDistricts(uniqueDistricts);
      } catch {
        setDistricts([]);
      }
    };

    void loadDistricts();
    void fetchMembers();
  }, []);

  useEffect(() => {
    void fetchMembers(selectedDistrict || undefined);
  }, [selectedDistrict]);

  const formatAddress = (member: MemberRow) => {
    const parts = [
      member.house_flat_no,
      member.street_locality,
      member.village_city,
      member.district,
      member.state,
      member.pincode ? `PIN: ${member.pincode}` : null,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : "-";
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registered Members</h1>
          <p className="mt-1 text-neutral">Approved members currently registered in the system.</p>
        </div>
        <Link href="/admin" className="btn-primary inline-block">
          Back to Dashboard
        </Link>
      </div>

      <div className="mt-6 max-w-sm">
        <label htmlFor="district-filter" className="label-text">
          Select District
        </label>
        <select
          id="district-filter"
          value={selectedDistrict}
          onChange={(e) => setSelectedDistrict(e.target.value)}
          className="input-field"
        >
          <option value="">All Districts</option>
          {districts.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Mobile
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Address
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-neutral">
                    No registered members found.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{member.name || "-"}</td>
                    <td className="px-4 py-3 text-sm text-neutral">{member.email || "-"}</td>
                    <td className="px-4 py-3 text-sm text-neutral">{member.phone_number || "-"}</td>
                    <td className="px-4 py-3 text-sm text-neutral">{formatAddress(member)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
