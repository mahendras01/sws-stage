import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-sm text-slate-600 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>© 2026 Self-Welfare Society</div>

        <div className="flex flex-wrap items-center gap-4">
          <Link href="/about-us" className="hover:text-sky-700">About Us</Link>
          <Link href="/contact" className="hover:text-sky-700">Contact</Link>
          <Link href="/terms" className="hover:text-sky-700">Terms</Link>
          <Link href="/privacy-policy" className="hover:text-sky-700">Privacy</Link>
          <Link href="/annual-maintenance" className="font-semibold text-sky-700 hover:text-sky-800">Annual Maintenance</Link>
        </div>
      </div>
    </footer>
  );
}
