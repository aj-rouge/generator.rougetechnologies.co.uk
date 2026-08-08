import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { NotificationProvider } from "../context/NotificationContext";
import DotGridBackground from "../components/DotGridBackground";
import "../globals.css";

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

// Added explicit typing to children
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 
                  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                document.documentElement.classList.add(theme);
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          <div className="flex max-h-screen h-screen bg-gray-100 dark:bg-black overflow-hidden relative">
            <DotGridBackground />
            <div className="flex-1 flex flex-col overflow-auto relative z-10">
              <NotificationProvider>{children}</NotificationProvider>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
