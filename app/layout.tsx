import '@/app/ui/global.css'
import { inter } from '@/app/ui/fonts'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | Acme Dashboard by Victor Wan',
    default: 'Acme Dashboard by Victor Wan',
  },
  description: 'Victor built Learn Dashboard, with App Router.',
  metadataBase: new URL('https://next-learn-dashboard.vercel.sh'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  )
}
