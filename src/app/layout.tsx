import { Cinzel, Fraunces, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider, AuthProvider, QueryProvider } from "@/lib/providers";
import { ScrollToTop } from "@/components/ScrollToTop";
import "@/styles/globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-cinematic",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${cinzel.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>
          <AuthProvider>
            <QueryProvider>
              <ScrollToTop />
              {children}
              <Toaster position="top-center" />
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
