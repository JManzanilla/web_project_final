import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Torneo API",
  description: "Backend del Torneo Municipal de Basketball",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
