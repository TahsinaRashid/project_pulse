import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UiEffects } from "./components/UiEffects";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "ProjectPulse",
  description: "Project health monitoring dashboard for client and delivery teams.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-100 text-slate-900">
        <UiEffects />
        {children}
      </body>
    </html>
  );
}
