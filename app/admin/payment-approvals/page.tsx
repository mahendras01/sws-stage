export default function PaymentApprovalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Approvals</h1>
        <p className="mt-1 text-neutral">Manual payment review is disabled.</p>
      </div>

      <div className="card p-8 text-sm text-slate-700">
        <p className="font-medium text-gray-900">Manual payment approval has been disabled.</p>
        <p className="mt-2">Sahyog receipts are now approved automatically on successful upload, and no admin intervention is required for payment status updates.</p>
      </div>
    </div>
  );
}
