import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { PwaRegister } from "@/components/pwa-register";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "ARJT Store",
    template: "%s | ARJT Store"
  },
  description: "Order ahead from ARJT Store and skip the school-break line.",
  applicationName: "ARJT Store",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ARJT Store",
    statusBarStyle: "default"
  },
  openGraph: {
    title: "ARJT Store",
    description: "Smart school-front convenience store ordering.",
    type: "website"
  }
};

export const viewport: Viewport = {
  themeColor: "#9f1239",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen font-sans antialiased`}>
        <AppProviders>
          {children}
          <Toaster richColors position="top-center" />
          <PwaRegister />
        </AppProviders>
      </body>
    </html>
  );
}
