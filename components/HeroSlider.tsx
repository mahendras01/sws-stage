"use client";

import Image from "next/image";

export default function HeroSlider() {
  return (
    <section className="relative w-full overflow-hidden bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="relative h-[42vh] min-h-[220px] w-full overflow-hidden border-b border-gray-200 sm:h-[48vh] sm:min-h-[300px] md:h-[56vh] md:min-h-[360px] lg:h-[62vh] lg:min-h-[420px] xl:h-[68vh]">
        <Image
          src="/images/Self_Welfare_Society_Registration.jpg"
          alt="Self Welfare Society registration banner"
          fill
          priority
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 100vw"
          className="h-full w-full object-cover object-center"
        />
      </div>
    </section>
  );
}
