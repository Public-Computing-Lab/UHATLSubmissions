import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SubmissionProvider } from "./context/SubmissionContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Urban Heat ATL",
  description: "Geospatial Analysis of Urban Heat Islands in Atlanta.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistMono.variable} font-mono antialiased bg-white text-black`}
      >
        <SubmissionProvider>
          <main>
            {children}
          </main>
        </SubmissionProvider>
      </body>
    </html>
  );
}
