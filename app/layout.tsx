import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tile Studio — OSRS Tile Marker Editor",
  description: "View OSRS maps and edit tile markers. Import RuneLite profiles and export markers by area, visible map, or entire layout.",
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
