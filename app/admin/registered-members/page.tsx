"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

type MemberRow = {
  id: string;
  serial_number?: number | null;
  ehrms_code?: string | null;
  name: string;
  role_number?: string | null;
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
  const [allMembers, setAllMembers] = useState<MemberRow[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [blockOptions, setBlockOptions] = useState<string[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("All");
  const [loading, setLoading] = useState(true);

  const fetchMembers = async (district?: string, block?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (district) params.set("district", district);
      if (block && block !== "All") params.set("block", block);

      const query = params.toString() ? `?${params.toString()}` : "";
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
    const loadData = async () => {
      try {
        const res = await fetch("/api/admin/approved-users");
        const data = await res.json();
        const users = (data.users ?? []) as MemberRow[];
        setAllMembers(users);

        const uniqueDistricts: string[] = Array.from(
          new Set<string>(
            users
              .map((user) => user.district)
              .filter((value: string | null | undefined): value is string => Boolean(value && value.trim())),
          ),
        ).sort((a: string, b: string) => a.localeCompare(b));
        setDistricts(uniqueDistricts);
      } catch {
        setAllMembers([]);
        setDistricts([]);
      }
    };

    void loadData();
  }, []);

  useEffect(() => {
    if (!selectedDistrict) {
      setBlockOptions([]);
      setSelectedBlock("All");
      void fetchMembers(undefined, "All");
      return;
    }

    const options = Array.from(
      new Set(
        allMembers
          .filter((user) => user.district === selectedDistrict)
          .map((user) => user.village_city)
          .filter((value): value is string => Boolean(value && value.trim())),
      ),
    ).sort((a: string, b: string) => a.localeCompare(b));

    setBlockOptions(options);
    setSelectedBlock((prev) => (options.includes(prev) || prev === "All" ? prev : "All"));
  }, [selectedDistrict, allMembers]);

  useEffect(() => {
    void fetchMembers(selectedDistrict || undefined, selectedBlock === "All" ? undefined : selectedBlock || undefined);
  }, [selectedDistrict, selectedBlock]);

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

      <div className="mt-6 grid gap-4 md:max-w-2xl md:grid-cols-2">
        <div>
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

        <div>
          <label htmlFor="block-filter" className="label-text">
            Block / Village / City
          </label>
          <select
            id="block-filter"
            value={selectedBlock}
            onChange={(e) => setSelectedBlock(e.target.value)}
            className="input-field"
            disabled={!selectedDistrict || blockOptions.length === 0}
          >
            <option value="All">All</option>
            {blockOptions.map((block) => (
              <option key={block} value={block}>
                {block}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Serial Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  EHRMS
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Role Number
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
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-neutral">
                    No registered members found.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{member.serial_number ?? "-"}</td>
                    <td className="px-4 py-3 text-sm text-neutral">{member.ehrms_code || "-"}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{member.name || "-"}</td>
                    <td className="px-4 py-3 text-sm text-neutral">{member.role_number || "-"}</td>
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
