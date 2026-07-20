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
  title: "MemoryVault — Seal Your Memories in Time",
  description:
    "Create digital time capsules filled with messages, photos, and crypto gifts that unlock at a future date. Preserve what matters most.",
  manifest: "/manifest.json",
  openGraph: {
    title: "MemoryVault — Seal Your Memories in Time",
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
