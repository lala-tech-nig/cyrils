import { Outfit } from "next/font/google";
import "./globals.css";
import { AppProvider } from "../context/AppContext";
import { ToastProvider } from "../context/ToastContext";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata = {
  title: "Cyril's Foods - Best Food In Town",
  description: "Order delicious meals from Cyril's Foods.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        <AppProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}
