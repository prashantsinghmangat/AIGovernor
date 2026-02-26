import type { Metadata } from "next"
import { Outfit, JetBrains_Mono } from "next/font/google"
import "./globals.css"

import { QueryProvider } from "@/components/providers/query-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { SupabaseProvider } from "@/components/providers/supabase-provider"
import { Toaster } from "@/components/ui/sonner"

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "CodeGuard AI — Govern AI Before It Governs Your Codebase",
    template: "%s | CodeGuard AI",
  },
  description:
    "B2B SaaS AI Governance Platform for Engineering Teams. Detect AI-generated code, calculate AI Debt Scores, and track team-level AI adoption health.",
  keywords: [
    "AI governance",
    "AI code detection",
    "AI debt score",
    "code review",
    "engineering governance",
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <SupabaseProvider>
            <QueryProvider>
              {children}
              <Toaster position="bottom-right" richColors closeButton />
            </QueryProvider>
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
