import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "SHIFT//OS | Your next chapter, mapped",
  description:
    "Evidence-aware career planning, learning pathways, and opportunity alignment for Malaysia.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
