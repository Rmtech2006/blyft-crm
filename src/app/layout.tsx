import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/components/providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'BLYFT CRM',
  description: 'All-in-one CRM for BLYFT — manage clients, projects, leads, and your team.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <Providers>
          <TooltipProvider delayDuration={200}>
            {children}
          </TooltipProvider>
        </Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
