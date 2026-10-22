import AnnualMaintenanceUploadForm from "@/components/AnnualMaintenanceUploadForm";

export default function UploadAnnualMaintenanceReceiptPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Annual Maintenance</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">अपलोड भुगतान रसीद फॉर्म</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Submit your annual maintenance payment details for verification and processing.
        </p>
      </div>

      <AnnualMaintenanceUploadForm />
    </div>
  );
}
