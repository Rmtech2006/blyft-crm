import type { Metadata } from 'next'
import './globals.css'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/components/providers'

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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <Providers>
          <TooltipProvider delay={200}>
            {children}
          </TooltipProvider>
        </Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
