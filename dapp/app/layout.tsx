import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ChainInvoice - On Chain Invoice Financing & Settlement",
  description: "Transform unpaid invoices into immediate cash flow with blockchain-powered invoice financing. Transparent, fast, and global."
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body id="root">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
