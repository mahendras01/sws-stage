"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [pendingCount, setPendingCount] = useState(0);

  const isDistrictScopedAdmin = session?.user?.role === "district_admin" || session?.user?.role === "district_co_admin";
  const isCountryLevelAdmin = session?.user?.role === "super_admin" || session?.user?.role === "country_co_admin";

  const navItems = isDistrictScopedAdmin
    ? [
        { href: "/admin", label: "Dashboard", exact: true },
        {
          href: "/admin/approve-members",
          label: "District Approvals",
        },
        { href: "/admin/registered-members", label: "Registered Members" },
      ]
    : [
        { href: "/admin", label: "Dashboard", exact: true },
        {
          href: "/admin/approve-members",
          label: "Pending Approvals",
        },
        { href: "/admin/registered-members", label: "Registered Members" },
        { href: "/admin/add-death", label: "Add Death" },
        { href: "/admin/view-deaths", label: "View Deaths" },
        ...(isCountryLevelAdmin ? [{ href: "/admin/create-admin", label: "Create Admin" }] : []),
        ...(isCountryLevelAdmin ? [{ href: "/admin/manage-admins", label: "Manage Admins" }] : []),
      ];

  useEffect(() => {
    fetch("/api/admin/pending-users")
      .then((res) => res.json())
      .then((data) => {
        if (data.users) setPendingCount(data.users.length);
      })
      .catch(() => {});
  }, [pathname]);

  return (
    <aside className="w-full shrink-0 lg:w-64">
      <div className="card sticky top-4">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Admin Panel</h2>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {item.label}
                {item.href === "/admin/approve-members" && pendingCount > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      isActive ? "bg-white text-primary" : "bg-danger text-white"
                    }`}
                  >
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
