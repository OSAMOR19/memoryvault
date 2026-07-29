import { Geist } from "next/font/google";
import "./globals.css";
import StorageCleaner from "./components/StorageCleaner";
import Web3Provider from "./components/Web3Provider";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "NimCapsule — Seal Your Memories in Time",
  description:
    "Create digital time capsules filled with messages, photos, and crypto gifts that unlock at a future date. Preserve what matters most.",
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
      { url: '/icon.png', type: 'image/png' },
    ],
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "NimCapsule — Seal Your Memories in Time",
    description:
      "Create digital time capsules filled with messages, photos, and gifts that unlock at a future date.",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={geist.variable}>
      <body>
        <Web3Provider>
          <StorageCleaner />
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
