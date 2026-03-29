import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Adventure Engine of Corvran",
  description: "A tabletop RPG adventure engine",
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
