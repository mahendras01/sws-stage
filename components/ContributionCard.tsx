import type { Contribution } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/validation";

interface ContributionCardProps {
  contribution: Contribution;
}

export default function ContributionCard({ contribution }: ContributionCardProps) {
  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      <div className="relative flex flex-col items-center">
        <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
          {contribution.contributor_name.charAt(0).toUpperCase()}
        </div>
        <div className="absolute top-10 h-full w-0.5 bg-gray-200" />
      </div>

      <div className="card flex-1 py-4">
        <p className="text-sm text-gray-700">
          <span className="font-semibold text-gray-900">{contribution.contributor_name}</span>{" "}
          contributed{" "}
          <span className="font-bold text-primary">{formatCurrency(contribution.amount)}</span> on{" "}
          <span className="text-neutral">{formatDate(contribution.contribution_date)}</span>
        </p>
      </div>
    </div>
  );
}
