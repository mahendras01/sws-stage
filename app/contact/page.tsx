import type { Metadata } from "next";
import Link from "next/link";
import InfoPageShell from "@/components/InfoPageShell";
import { getSession } from "@/lib/auth";
import { canManageContacts, listContactPersons, type ContactPerson } from "@/lib/contact-persons";
import { log } from "@/lib/logger";

export const metadata: Metadata = {
  title: "Contact | Self-Welfare Society",
  description: "Get in touch with the Self-Welfare Society office bearers for support and inquiries.",
};

export const dynamic = "force-dynamic";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const picked = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return picked.map((part) => Array.from(part)[0] ?? "").join("").toUpperCase();
}

function PhoneIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.95.68l1.5 4.5a1 1 0 01-.5 1.2l-2.26 1.13a11.04 11.04 0 005.52 5.52l1.13-2.26a1 1 0 011.2-.5l4.5 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.66 16.66L13.41 20.9a2 2 0 01-2.82 0l-4.25-4.24a8 8 0 1111.32 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ContactCard({ person, showAll }: { person: ContactPerson; showAll: boolean }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-600 to-cyan-500 text-lg font-semibold text-white shadow-sm">
          {initials(person.name)}
        </div>
        <div className="min-w-0">
          <h3 className="break-words text-lg font-semibold leading-snug text-slate-900">{person.name}</h3>
          {showAll && person.designation && (
            <span className="mt-1 inline-block rounded-full bg-sky-50 px-3 py-0.5 text-xs font-medium text-sky-700">
              {person.designation}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 flex-1 space-y-3 text-sm text-slate-700">
        <a
          href={`tel:${person.mobile_number}`}
          className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 font-medium text-slate-800 transition hover:bg-sky-50 hover:text-sky-700"
        >
          <span className="text-sky-600">
            <PhoneIcon />
          </span>
          {person.mobile_number}
        </a>

        {showAll && person.email && (
          <a href={`mailto:${person.email}`} className="flex items-center gap-3 break-all px-3 transition hover:text-sky-700">
            <span className="text-sky-600">
              <MailIcon />
            </span>
            {person.email}
          </a>
        )}

        {showAll && person.address && (
          <p className="flex items-start gap-3 whitespace-pre-line px-3 leading-6">
            <span className="mt-1 text-sky-600">
              <PinIcon />
            </span>
            {person.address}
          </p>
        )}
      </div>
    </article>
  );
}

export default async function ContactPage() {
  const session = await getSession();
  const isSuperAdmin = canManageContacts(session?.user?.role);

  // Only enabled contacts are listed here (disabled ones are managed from the Admin section).
  // Only the Super Admin gets designation/email/address; everyone else gets name + mobile number only.
  const { data, error } = await listContactPersons(false);
  const contacts: ContactPerson[] = isSuperAdmin
    ? data
    : data.map((person) => ({
        id: person.id,
        name: person.name,
        mobile_number: person.mobile_number,
        designation: null,
        email: null,
        address: null,
        sort_order: person.sort_order,
        is_active: person.is_active,
      }));

  if (error) {
    log.error("contact.page.load_failed", { error });
  }

  return (
    <InfoPageShell
      title="Contact Us"
      intro="Reach out to our office bearers for membership help, support coordination, or any information about our welfare activities."
      breadcrumb={[{ label: "Contact", href: undefined }]}
    >
      {isSuperAdmin && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-sky-900">
            You are viewing full contact details as Super Admin. Members only see name and mobile number.
          </p>
          <Link href="/admin/contact-persons" className="btn-primary shrink-0">
            Manage Contacts
          </Link>
        </div>
      )}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700">
          Contact details could not be loaded right now. Please try again shortly.
        </div>
      ) : contacts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-900">Contact details coming soon</h2>
          <p className="mt-2 text-sm text-slate-600">Our office bearers&apos; contact details will be published here shortly.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((person) => (
            <ContactCard key={person.id} person={person} showAll={isSuperAdmin} />
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-slate-500">Tap a mobile number to call.</p>
    </InfoPageShell>
  );
}
