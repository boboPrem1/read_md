import type { Metadata } from "next";
import { Bodoni_Moda, Hanken_Grotesk, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const displayFont = Bodoni_Moda({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-display",
});

const uiFont = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-ui",
});

const readingFont = Source_Serif_4({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-reading",
});

export const metadata: Metadata = {
  title: "Lecteur Markdown",
  description: "Lecteur Markdown autonome, élégant et performant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${displayFont.variable} ${uiFont.variable} ${readingFont.variable}`}>
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body>{children}</body>
    </html>
  );
}
