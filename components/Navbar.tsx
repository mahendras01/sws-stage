"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

const publicMenuItems: Array<{ href: string; label: string }> = [
  { href: "/", label: "HOME" },
  { href: "/about-us", label: "ABOUT US" },
  { href: "/gallery", label: "GALLERY" },
  { href: "/sahyog-list", label: "SAHYOG LIST" },
  { href: "/jivandan-list", label: "JIVANDAN LIST" },
  { href: "/kanyadan-list", label: "KANYADAN LIST" },
  { href: "/contact", label: "CONTACT" },
  { href: "/login", label: "LOGIN" },
  { href: "/signup", label: "REGISTER" },
];

type NavItem =
  | { href: string; label: string }
  | { href: null; label: string; action: () => Promise<void> };

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const uploadRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (uploadRef.current && !uploadRef.current.contains(event.target as Node)) {
        setUploadOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    await signOut({ callbackUrl: "/" });
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  };

  const navItems: NavItem[] = session
    ? [
        ...publicMenuItems.filter((item) => item.label !== "LOGIN" && item.label !== "REGISTER"),
        ...(session.user.is_admin ? [{ href: "/dashboard", label: "DASHBOARD" }] : []),
        ...(session.user.is_admin ? [{ href: "/admin", label: "ADMIN" }] : []),
      ]
    : publicMenuItems;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-sky-700 bg-sky-600 shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="hidden flex-1 items-center justify-center md:flex">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {navItems.map((item) =>
              item.href === null ? (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className="rounded-full px-3 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-sky-700 hover:text-white"
                >
                  {item.label}
                </button>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-sky-700 hover:text-white ${
                    isActive(item.href) ? "bg-sky-800 shadow-sm" : "bg-transparent"
                  }`}
                >
                  {item.label}
                </Link>
              )
            )}
            {session && (
              <>
                <div ref={uploadRef} className="relative ml-1">
                  <button
                    type="button"
                    onClick={() => setUploadOpen((prev) => !prev)}
                    className="rounded-full px-3 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-sky-700 hover:text-white"
                  >
                    Upload Receipt
                  </button>

                  {uploadOpen && (
                    <div className="absolute left-0 mt-2 w-44 rounded-xl border bg-white p-2 shadow-lg">
                      <Link
                        href="/upload-receipt"
                        onClick={() => setUploadOpen(false)}
                        className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Upload Sahyog Receipt
                      </Link>
                      <Link
                        href="/view-sahyog-receipt"
                        onClick={() => setUploadOpen(false)}
                        className="mt-1 block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        View Sahyog Receipt
                      </Link>
                    </div>
                  )}
                </div>

                <div ref={userMenuRef} className="relative ml-1">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((prev) => !prev)}
                    className="flex items-center gap-2 rounded-full bg-sky-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-800"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-sky-700">
                      {getInitials(session.user.name)}
                    </span>
                    <span className="hidden lg:inline">{session.user.name}</span>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                      <Link
                        href="/profile"
                        className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        My Profile
                      </Link>
                      {/* Upload Receipt moved to main navbar */}
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          void handleLogout();
                        }}
                        className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 md:hidden">
          {!session && (
            <>
              <Link
                href="/login"
                className="rounded-full bg-sky-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-800"
              >
                LOGIN
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-sky-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-800"
              >
                REGISTER
              </Link>
            </>
          )}

          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            className="rounded-full p-2 text-white transition-colors hover:bg-sky-700"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-navigation" className="border-t border-sky-700 bg-sky-600 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-2">
            {navItems
              .filter((item) => !(item.href === "/login" || item.href === "/signup"))
              .map((item) =>
                item.href === null ? (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.action}
                    className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-white transition-colors hover:bg-sky-700"
                  >
                    {item.label}
                  </button>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors ${
                      isActive(item.href) ? "bg-sky-800" : "hover:bg-sky-700"
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              )}

            {session && (
              <>
                <Link
                  href="/upload-receipt"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
                >
                  Upload Sahyog Receipt
                </Link>
                <Link
                  href="/view-sahyog-receipt"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
                >
                  View Sahyog Receipt
                </Link>
              </>
            )}

            {session && (
              <div className="mt-2 rounded-lg border border-sky-500 bg-sky-700 p-2">
                <div className="mb-2 flex items-center gap-3 px-2 py-1 text-white">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-bold text-sky-700">
                    {getInitials(session.user.name)}
                  </span>
                  <span className="font-semibold">{session.user.name}</span>
                </div>
                <Link
                  href="/profile"
                  className="block rounded-lg px-3 py-2 text-left text-sm font-semibold text-white hover:bg-sky-800"
                >
                  My Profile
                </Link>
                {/* Upload Receipt moved to main navbar */}
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-white hover:bg-sky-800"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
