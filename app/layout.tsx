import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LiveNode Decision Trace",
  description: "Turn a messy decision memo into a traceable decision structure.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
