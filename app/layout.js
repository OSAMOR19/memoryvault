import { Montserrat } from "next/font/google";
import "./globals.css";
import StorageCleaner from "./components/StorageCleaner";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata = {
  title: "MemoryVault — Seal Your Memories in Time",
  description:
    "Create digital time capsules filled with messages, photos, and NIM crypto gifts that unlock at a future date. Preserve what matters most.",
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
    <html lang="en" className={montserrat.variable}>
      <body>
        <StorageCleaner />
        {children}
      </body>
    </html>
  );
}

