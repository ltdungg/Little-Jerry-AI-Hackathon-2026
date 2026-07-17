import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NPO AI Platform - Trợ lý AI",
  description: "Trợ lý AI cho NPO AI Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
