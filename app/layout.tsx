import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CityCase",
  description: "Workspace investigativo per casi storici esplorabili."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
