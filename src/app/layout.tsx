import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "A3 V2 — Agile Artifact Architect",
  description: "Automated Jira work item creation powered by AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
