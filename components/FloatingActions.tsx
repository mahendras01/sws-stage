"use client";

export default function FloatingActions() {
  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-3 sm:bottom-6 sm:right-6">
      <a
        href="tel:+919999999999"
        aria-label="Call us"
        className="flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-primary/90"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h2.5a1 1 0 01.98.8l.6 3.6a1 1 0 01-.2.88L7.2 10.2a15 15 0 006.6 6.6l1.92-1.68a1 1 0 01.88-.2l3.6.6A1 1 0 0121 18.5V21a2 2 0 01-2 2h-1C9.6 23 1 14.4 1 3V2a2 2 0 012-2h2.5z" />
        </svg>
        <span className="hidden sm:inline">Call</span>
      </a>

      <a
        href="https://wa.me/919999999999"
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        className="flex items-center gap-2 rounded-full bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-green-500"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.966-.273-.099-.471-.149-.67.149-.198.297-.768.966-.941 1.164-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.149-.174.199-.298.299-.497.099-.198.049-.372-.025-.521-.074-.149-.669-1.612-.916-2.207-.241-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.521.074-.793.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.073.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.174-1.413-.074-.124-.273-.198-.57-.347z" />
          <path d="M20.52 3.449C18.24 1.17 15.24 0 12.01 0 5.48 0 .0 5.48.0 12.01c0 2.11.55 4.17 1.59 5.98L0 24l6.12-1.61c1.75.95 3.72 1.46 5.74 1.46 6.53 0 11.99-5.48 11.99-12.01 0-3.22-1.25-6.25-3.53-8.53zM12.01 21.93c-1.8 0-3.56-.48-5.08-1.38l-.36-.21-3.63.95.97-3.54-.23-.37a9.93 9.93 0 0 1-1.53-5.32c0-5.49 4.47-9.96 9.97-9.96 2.65 0 5.15 1.04 7.02 2.92 1.87 1.88 2.91 4.38 2.91 7.03 0 5.49-4.47 9.96-9.96 9.96z" />
        </svg>
        <span className="hidden sm:inline">WhatsApp</span>
      </a>
    </div>
  );
}
