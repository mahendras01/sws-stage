"use client";

import Image from "next/image";

export default function HeroSlider() {
  return (
    <section className="relative w-full overflow-hidden bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="relative h-[70vh] min-h-[420px] w-full overflow-hidden border-b border-gray-200">
        <Image
          src="/images/Self_Welfare_Society_Registration.jpg"
          alt="Self Welfare Society registration banner"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>
    </section>
  );
}
