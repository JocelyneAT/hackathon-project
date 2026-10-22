import type { Metadata } from "next";
import "./globals.css";
import "./journey.css";
import "./job-listings.css";
export const metadata: Metadata = {
  title: "SHIFT//OS | Plan your career",
  description:
    "Compare career options, check your skills, and make a learning plan in Malaysia.",
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
