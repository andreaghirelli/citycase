import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CityCase",
  description: "Workspace investigativo per casi storici esplorabili.",
  icons: {
    icon: "/brand/citycase-logo-symbol.png",
    apple: "/brand/citycase-logo-symbol.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
