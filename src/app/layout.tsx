import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RATEL Registar Baznih Stanica | Srbija",
  description:
    "Interaktivni pregled registra evidentiranih radio-stanica u javnoj mobilnoj elektronskoj komunikacionoj mreži Srbije — RATEL.",
  openGraph: {
    title: "RATEL Registar Baznih Stanica",
    description: "138 000+ baznih stanica mobilnih operatora u Srbiji",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Leaflet CSS */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
