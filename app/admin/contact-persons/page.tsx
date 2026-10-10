"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Contact = {
  id: string;
  name: string;
  designation: string | null;
  mobile_number: string;
  email: string | null;
  address: string | null;
  sort_order: number;
  is_active: boolean;
};

type FormState = {
  id: string;
  name: string;
  designation: string;
  mobile_number: string;
  email: string;
  address: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  id: "",
  name: "",
  designation: "",
  mobile_number: "",
  email: "",
  address: "",
  is_active: true,
};

const DEFAULT_MAX = 7;

export default function ManageContactPersonsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [max, setMax] = useState(DEFAULT_MAX);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isSuperAdmin = session?.user?.role === "super_admin";

  const loadContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/contact-persons", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Failed to load contacts.");
        return;
      }
      setContacts(json.contacts ?? []);
      if (typeof json.max === "number") setMax(json.max);
    } catch {
      setError("Failed to load contacts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/login");
      return;
    }
    if (!isSuperAdmin) {
      router.push("/admin");
      return;
    }
    void loadContacts();
  }, [status, session, isSuperAdmin, router, loadContacts]);

  const flash = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 3000);
  };

  const openAdd = () => {
    setError("");
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (contact: Contact) => {
    setError("");
    setForm({
      id: contact.id,
      name: contact.name,
      designation: contact.designation ?? "",
      mobile_number: contact.mobile_number,
      email: contact.email ?? "",
      address: contact.address ?? "",
      is_active: contact.is_active,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSaving(true);

    const { id, ...fields } = form;
    try {
      const res = await fetch(id ? `/api/admin/contact-persons/${id}` : "/api/admin/contact-persons", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Failed to save contact.");
        return;
      }
      closeForm();
      flash(id ? "Contact updated." : "Contact added.");
      await loadContacts();
    } catch {
      setError("Failed to save contact.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (contact: Contact) => {
    setError("");
    setBusyId(contact.id);
    try {
      const res = await fetch(`/api/admin/contact-persons/${contact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !contact.is_active }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Failed to update contact.");
        return;
      }
      flash(contact.is_active ? "Contact disabled." : "Contact enabled.");
      await loadContacts();
    } catch {
      setError("Failed to update contact.");
    } finally {
      setBusyId(null);
    }
  };

  const removeContact = async (contact: Contact) => {
    if (!window.confirm(`Delete "${contact.name}"? This cannot be undone.`)) return;
    setError("");
    setBusyId(contact.id);
    try {
      const res = await fetch(`/api/admin/contact-persons/${contact.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Failed to delete contact.");
        return;
      }
      flash("Contact deleted.");
      await loadContacts();
    } catch {
      setError("Failed to delete contact.");
    } finally {
      setBusyId(null);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= contacts.length) return;

    const next = [...contacts];
    [next[index], next[target]] = [next[target], next[index]];
    const previous = contacts;
    setContacts(next);
    setError("");
    setBusyId(next[target].id);

    try {
      const res = await fetch("/api/admin/contact-persons/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((item) => item.id) }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setContacts(previous);
        setError(json.message || "Failed to save order.");
      }
    } catch {
      setContacts(previous);
      setError("Failed to save order.");
    } finally {
      setBusyId(null);
    }
  };

  if (status === "loading" || !isSuperAdmin) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  const limitReached = contacts.length >= max;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Contacts</h1>
          <p className="mt-1 text-sm text-gray-600">
            Contacts shown on the{" "}
            <Link href="/contact" className="text-primary underline">
              Contact page
            </Link>
            . Members see only name and mobile number. ({contacts.length}/{max} used)
          </p>
        </div>
        <button type="button" className="btn-primary shrink-0" onClick={openAdd} disabled={limitReached || showForm}>
          Add Contact
        </button>
      </div>

      {limitReached && !showForm && (
        <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Maximum of {max} contacts reached. Delete a contact to add another.
        </p>
      )}
      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{notice}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">{form.id ? "Edit Contact" : "Add Contact"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-text" htmlFor="cp-name">
                Name *
              </label>
              <input
                id="cp-name"
                className="input-field"
                value={form.name}
                maxLength={150}
                required
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label-text" htmlFor="cp-designation">
                Designation / Role
              </label>
              <input
                id="cp-designation"
                className="input-field"
                value={form.designation}
                maxLength={150}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
              />
            </div>
            <div>
              <label className="label-text" htmlFor="cp-mobile">
                Mobile Number *
              </label>
              <input
                id="cp-mobile"
                className="input-field"
                type="tel"
                inputMode="tel"
                value={form.mobile_number}
                required
                onChange={(e) => setForm({ ...form, mobile_number: e.target.value })}
              />
            </div>
            <div>
              <label className="label-text" htmlFor="cp-email">
                Email
              </label>
              <input
                id="cp-email"
                className="input-field"
                type="email"
                value={form.email}
                maxLength={255}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label-text" htmlFor="cp-address">
              Address / Other Details
            </label>
            <textarea
              id="cp-address"
              className="input-field"
              rows={3}
              maxLength={500}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Show on Contact page
          </label>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : form.id ? "Update Contact" : "Save Contact"}
            </button>
            <button type="button" className="btn-secondary" onClick={closeForm} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading contacts...</p>
      ) : contacts.length === 0 ? (
        <div className="card text-center text-sm text-gray-600">No contacts yet. Click &quot;Add Contact&quot; to create one.</div>
      ) : (
        <ul className="space-y-3">
          {contacts.map((contact, index) => (
            <li
              key={contact.id}
              className={`card flex flex-col gap-4 lg:flex-row lg:items-center ${contact.is_active ? "" : "bg-gray-50 opacity-75"}`}
            >
              <div className="flex shrink-0 items-center gap-2 lg:flex-col">
                <button
                  type="button"
                  className="btn-secondary !px-2 !py-1"
                  aria-label={`Move ${contact.name} up`}
                  disabled={index === 0 || busyId !== null}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <span className="w-6 text-center text-xs font-semibold text-gray-500">{index + 1}</span>
                <button
                  type="button"
                  className="btn-secondary !px-2 !py-1"
                  aria-label={`Move ${contact.name} down`}
                  disabled={index === contacts.length - 1 || busyId !== null}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
              </div>

              <div className="min-w-0 flex-1 space-y-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-gray-900">{contact.name}</p>
                  {contact.designation && (
                    <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">{contact.designation}</span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      contact.is_active ? "bg-green-50 text-green-700" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {contact.is_active ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <p className="text-gray-700">Mobile: {contact.mobile_number}</p>
                {contact.email && <p className="break-all text-gray-700">Email: {contact.email}</p>}
                {contact.address && <p className="whitespace-pre-line text-gray-700">Address: {contact.address}</p>}
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <button type="button" className="btn-secondary" onClick={() => openEdit(contact)} disabled={busyId !== null}>
                  Edit
                </button>
                <button type="button" className="btn-secondary" onClick={() => toggleActive(contact)} disabled={busyId !== null}>
                  {contact.is_active ? "Disable" : "Enable"}
                </button>
                <button type="button" className="btn-danger" onClick={() => removeContact(contact)} disabled={busyId !== null}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
