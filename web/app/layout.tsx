import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: "CMMC Self-Assessment",
  description: "MVP for CMMC / NIST 800-171 self-assessment and SPRS scoring",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
