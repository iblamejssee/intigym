import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Inti-Gym Ayacucho - Sistema de Gestión",
  description: "Sistema de gestión premium para gimnasios",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          position="top-right"
          theme="dark"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              success: "!bg-green-600/20 !border !border-emerald-500/50 !text-emerald-300 !backdrop-blur-xl",
              error: "!bg-[#AB8745]/20 !border !border-[#CB9755]/50 !text-[#E0BA85] !backdrop-blur-xl",
              warning: "!bg-yellow-600/20 !border !border-yellow-500/50 !text-yellow-300 !backdrop-blur-xl",
              info: "!bg-blue-600/20 !border !border-blue-500/50 !text-blue-300 !backdrop-blur-xl",
            },
            style: {
              background: 'rgba(10, 10, 10, 0.95)',
              border: '1px solid',
            },
          }}
        />
      </body>
    </html>
  );
}
