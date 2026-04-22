import { Outfit } from "next/font/google";
import "./globals.css";
import { AppProvider } from "../context/AppContext";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata = {
  title: "Cyril's Foods - Best Food In Town",
  description: "Order delicious meals from Cyril's Foods.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
