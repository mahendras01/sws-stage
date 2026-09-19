import Link from "next/link";

export default function AnnouncementBar() {
  return (
    <div className="border-b border-gray-200 bg-primary/10">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex-1 overflow-hidden">
          <div className="animate-[marquee_16s_linear_infinite] whitespace-nowrap text-sm font-medium text-gray-800">
            New members can register online • Admin approvals are now faster • Community support updates every week • Read the latest welfare notices here
          </div>
        </div>
        <Link
          href="/signup"
          className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-primary/90"
        >
          Read More
        </Link>
      </div>
    </div>
  );
}
