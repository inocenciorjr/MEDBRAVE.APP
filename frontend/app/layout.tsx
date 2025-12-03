import type { Metadata } from "next";
import { IBM_Plex_Sans, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider, QueryProvider } from "./providers";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { ToastProvider } from "@/lib/contexts/ToastContext";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { UserProvider } from "@/contexts/UserContext";

const ibmPlexSans = IBM_Plex_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: 'swap',
});

const inter = Inter({
  weight: ['400', '500', '600', '700'],
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "MedBRAVE - O Portal do Revalidando",
  description: "Seja Corajoso, Seja BRAVE!",
  icons: {
    icon: [
      { url: '/medbravelogo-dark.png', type: 'image/png' },
    ],
    apple: [
      { url: '/medbravelogo-dark.png', type: 'image/png' },
    ],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <head>
        {/* Preload critical fonts */}
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
          as="style"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
          rel="stylesheet"
        />
        <link
          href="https://fonts.cdnfonts.com/css/azonix"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Prevent FOUC for Material Symbols */
            .material-symbols-outlined {
              font-family: 'Material Symbols Outlined', sans-serif;
              font-weight: normal;
              font-style: normal;
              font-size: 24px;
              line-height: 1;
              letter-spacing: normal;
              text-transform: none;
              display: inline-block;
              white-space: nowrap;
              word-wrap: normal;
              direction: ltr;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              text-rendering: optimizeLegibility;
              font-feature-settings: 'liga';
            }
          `
        }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 
                  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                document.documentElement.classList.add(theme);
              } catch (e) {}
              
              // Prevent FOUC by hiding icons until font loads
              if ('fonts' in document) {
                document.documentElement.classList.add('fonts-loading');
                document.fonts.ready.then(() => {
                  document.documentElement.classList.remove('fonts-loading');
                  document.documentElement.classList.add('fonts-loaded');
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${ibmPlexSans.variable} ${inter.variable} font-display antialiased bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary`}>
        <QueryProvider>
          <ToastProvider>
            <AuthProvider>
              <UserProvider>
                <ThemeProvider>
                  {children}
                  <ToastContainer />
                </ThemeProvider>
              </UserProvider>
            </AuthProvider>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
