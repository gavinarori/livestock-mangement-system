// app/layout.tsx  — Root layout (no sidebar here)
import type { Metadata } from 'next'
import { DM_Sans, Fraunces, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from './theme-provider'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' })
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-serif' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'HerdWise — Livestock Management',
  description: 'Modern livestock management system to track and manage your farm animals',
  icons: { apple: '/apple-icon.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSans.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}