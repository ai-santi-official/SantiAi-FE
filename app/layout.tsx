import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { LiffProvider } from "@/provider/LiffProvider";
import "./globals.css";

const lexend = Lexend({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-lexend",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Santi - Project Management Assistant",
  description: "Make your work easier",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${lexend.variable} font-sans text-black antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <LiffProvider>{children}</LiffProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
