import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import FloatingActions from "@/components/FloatingActions";
import Footer from "@/components/Footer";
import { getActiveLogoVersion } from "@/lib/site-logo";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const logoVersion = await getActiveLogoVersion();
  const iconUrl = logoVersion ? `/api/logo?v=${logoVersion}` : null;

  return {
    title: "Self-Welfare Society",
    description: "Mutual aid society platform for member welfare during emergencies",
    // The version in the URL changes whenever the Super Admin uploads/replaces/deletes the logo,
    // which makes browsers fetch the new tab icon. With no logo, the default browser icon is used.
    ...(iconUrl ? { icons: { icon: iconUrl, shortcut: iconUrl, apple: iconUrl } } : {}),
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Header />
          <Navbar />
          <main className="min-h-[calc(100vh-73px)]">{children}</main>
          <Footer />
          <FloatingActions />
        </Providers>
      </body>
    </html>
  );
}
