import Link from "next/link";
import type { ReactNode } from "react";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type InfoPageShellProps = {
  title: string;
  intro: string;
  breadcrumb: BreadcrumbItem[];
  children: ReactNode;
};

export default function InfoPageShell({ title, intro, breadcrumb, children }: InfoPageShellProps) {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="transition hover:text-sky-600">
                  Home
                </Link>
              </li>
              {breadcrumb.map((item, index) => (
                <li key={item.label} className="flex items-center gap-2">
                  {index > 0 && <span>/</span>}
                  {item.href ? (
                    <Link href={item.href} className="transition hover:text-sky-600">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-slate-700">{item.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-500 p-8 text-white shadow-sm">
            <p className="mb-3 text-sm uppercase tracking-[0.3em] text-sky-100">Self-Welfare Society</p>
            <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 sm:text-base">{intro}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">{children}</section>
    </main>
  );
}
