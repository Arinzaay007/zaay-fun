import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "zaay.fun — Launch a token on any prmpted.com post",
  description:
    "A pump-style bonding-curve launchpad for the prmpted.com community. Creator fees flow to the original poster — held in escrow until they claim.",
  metadataBase: new URL("https://zaay.fun"),
  openGraph: {
    title: "zaay.fun",
    description:
      "Launch bonding-curve tokens on prmpted.com posts. Creator fees for every poster.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
