import localFont from "next/font/local";
import "../globals.css";
import { ThemeProvider } from "next-themes";
import { NotificationProvider } from "../context/NotificationContext";
import DotGridBackground from "../components/DotGridBackground";

const geistSans = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "../fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "HTML Description Generator",
  description: "Generated eBay HTML Descriptions for your listings in seconds.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div className="flex max-h-screen h-screen bg-gray-100 dark:bg-black overflow-hidden relative">
            {/* Background component - now in layout */}
            <DotGridBackground />

            <div className="flex-1 flex flex-col overflow-auto relative z-10">
              <NotificationProvider>{children}</NotificationProvider>{" "}
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
