import Link from "next/link";
import HeroSlider from "@/components/HeroSlider";

export default function HomePage() {
  return (
    <div>
      <HeroSlider />

      <div className="bg-gray-50 py-10 sm:py-14 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Self-Welfare Society
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral">
              A mutual aid platform where members contribute to help families during emergencies and
              difficult times. Together, we support each other.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/signup" className="btn-primary px-8 py-3 text-base">
                Join the Society
              </Link>
              <Link href="/login" className="btn-secondary px-8 py-3 text-base">
                Member Login
              </Link>
            </div>
          </div>

          <div className="mt-20 grid gap-8 sm:grid-cols-3">
            {[
              {
                title: "Register & Verify",
                desc: "Sign up with KYC details. Admin verifies and approves your membership.",
              },
              {
                title: "Stay Informed",
                desc: "View death records and contribution history of fellow society members.",
              },
              {
                title: "Mutual Support",
                desc: "Contribute via bank transfer to help families in their time of need.",
              },
            ].map((item) => (
              <div key={item.title} className="card text-center">
                <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm text-neutral">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
