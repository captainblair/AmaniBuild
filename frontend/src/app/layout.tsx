import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AmaniBuild — Construction management for Kenyan builders",
    template: "%s | AmaniBuild",
  },
  description:
    "Run your construction sites like a pro. Site diary, attendance, procurement, inventory, QA, and client portal — built for Kenya.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
