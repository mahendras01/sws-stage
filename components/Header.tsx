import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 px-1 text-[0.78rem] font-extrabold tracking-[0.14em] text-primary">
            SWS
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Self-Welfare Society</h1>
            <p className="text-sm text-gray-600">Community support for families in need</p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-1 text-[0.95rem] leading-tight text-slate-700 sm:items-end sm:text-base">
          <a href="tel:+918987898789" className="font-semibold text-blue-800 transition hover:text-blue-700">
            <span className="font-semibold text-slate-700">Helpline Number:</span>{" "}
            <span className="font-bold text-blue-900">+91 8987898789</span>
          </a>
          <div className="font-medium text-slate-700">
            <span className="font-semibold text-blue-800">पंजीकरण संख्या:</span>{" "}
            <span className="font-bold text-slate-900">LUC/01051/2026-2027</span>
          </div>
        </div>
      </div>
    </header>
  );
}
