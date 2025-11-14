import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "On Chain Invoice Financing & Settlement",
  description: "A decentralized platform for invoice financing and settlement using blockchain technology."
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
