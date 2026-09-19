import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import FloatingActions from "@/components/FloatingActions";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Self-Welfare Society",
  description: "Mutual aid society platform for member welfare during emergencies",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Header />
          <Navbar />
          <main className="min-h-[calc(100vh-73px)]">{children}</main>
          <FloatingActions />
        </Providers>
      </body>
    </html>
  );
}
